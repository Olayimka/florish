require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const db = require('./services/dbService');
const emailService = require('./services/emailService');
const calendarService = require('./services/calendarService');
const paystackService = require('./services/paystackService');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limit for OTP requests
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: { error: 'Too many OTP requests from this IP. Please try again after 10 minutes.' }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'main' folder
app.use(express.static(path.join(__dirname, 'main')));

// ==================== PRODUCTS API ==================== //
app.get('/api/products', (req, res) => {
  res.json({ products: db.getProducts() });
});

app.post('/api/products', (req, res) => {
  try {
    const products = db.getProducts();
    const nextProduct = {
      id: Date.now(),
      name: req.body.name || 'New Product',
      category: req.body.category || 'Beauty',
      price: Number(req.body.price) || 15000,
      image: req.body.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
      description: req.body.description || 'Freshly uploaded product.',
      details: req.body.details || req.body.description || 'Freshly uploaded product.',
      sold: false
    };
    products.unshift(nextProduct);
    db.saveProducts(products);
    res.status(201).json({ product: nextProduct, products });
  } catch (err) {
    res.status(400).json({ error: 'Invalid product data' });
  }
});

app.post('/api/products/update', (req, res) => {
  try {
    const products = db.getProducts();
    const index = products.findIndex(p => String(p.id) === String(req.body.id));
    if (index >= 0) {
      products[index] = { ...products[index], ...req.body, price: Number(req.body.price) || products[index].price };
      db.saveProducts(products);
      res.json({ products });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

app.post('/api/products/delete', (req, res) => {
  try {
    const products = db.getProducts().filter(p => String(p.id) !== String(req.body.id));
    db.saveProducts(products);
    res.json({ products });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

// ==================== PERSISTENT CART API ==================== //
app.get('/api/cart', (req, res) => {
  const sessionId = req.query.session_id || req.headers['x-session-id'] || 'default-session';
  const cart = db.getCart(sessionId);
  res.json({ cart });
});

app.post('/api/cart/sync', (req, res) => {
  const sessionId = req.body.session_id || req.headers['x-session-id'] || 'default-session';
  const cartItems = Array.isArray(req.body.cart) ? req.body.cart : [];
  const savedCart = db.saveCart(sessionId, cartItems);
  res.json({ success: true, cart: savedCart });
});

// ==================== AUTH / EMAIL OTP API ==================== //
app.post('/api/auth/send-otp', otpLimiter, async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000);
  db.storeOTP(email, otpCode);

  try {
    const result = await emailService.sendOTPEmail(email, otpCode);
    res.json({
      success: true,
      message: `OTP sent successfully to ${email}`,
      demoMode: result.mode === 'demo',
      demoCode: result.mode === 'demo' ? otpCode : undefined
    });
  } catch (err) {
    console.error('OTP email error:', err);
    res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  const verification = db.verifyOTP(email, otp);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.reason });
  }

  res.json({ success: true, message: 'Email verified successfully', verifiedEmail: email });
});

// ==================== PAYSTACK PAYMENT CHECKOUT API ==================== //
app.post('/api/payment/initialize', async (req, res) => {
  try {
    const { email, cart, billingDetails } = req.body;
    if (!email || !Array.isArray(cart) || !cart.length) {
      return res.status(400).json({ error: 'Invalid cart or missing buyer email' });
    }

    const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    const orderRef = `FLR-${Date.now()}`;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${baseUrl}/create-payemt.html?orderRef=${orderRef}`;

    // Create pending order record
    const orderRecord = {
      orderRef,
      customerEmail: email,
      customerName: billingDetails?.name || 'Customer',
      customerPhone: billingDetails?.phone || '',
      cart,
      total: totalAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    db.saveOrder(orderRecord);

    // Initialize with Paystack
    const paystackResult = await paystackService.initializeTransaction({
      email,
      amountInNaira: totalAmount,
      reference: orderRef,
      callbackUrl,
      metadata: { orderRef, billingDetails }
    });

    res.json({
      success: true,
      orderRef,
      total: totalAmount,
      authorizationUrl: paystackResult.data.authorization_url,
      accessCode: paystackResult.data.access_code,
      reference: paystackResult.data.reference,
      mode: paystackResult.mode || 'live'
    });
  } catch (err) {
    console.error('Paystack init error:', err);
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

app.get('/api/payment/verify', async (req, res) => {
  const reference = req.query.reference || req.query.orderRef;
  if (!reference) {
    return res.status(400).json({ error: 'Missing payment reference' });
  }

  try {
    const paystackVerification = await paystackService.verifyTransaction(reference);
    if (paystackVerification.data.status === 'success') {
      const order = db.getOrderById(reference);
      if (order && order.status !== 'PAID') {
        order.status = 'PAID';
        order.paystackRef = reference;
        order.paidAt = new Date().toISOString();
        db.saveOrder(order);

        // Send confirmation emails to both Buyer and Company Admin
        await emailService.sendOrderConfirmationEmails(order);
      }
      return res.json({ success: true, status: 'PAID', order: order || paystackVerification.data });
    } else {
      return res.status(400).json({ success: false, status: paystackVerification.data.status });
    }
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify payment' });
  }
});

// Paystack Webhook endpoint for server-to-server confirmation
app.post('/api/payment/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const event = req.body;

  if (event && event.event === 'charge.success') {
    const reference = event.data.reference;
    const order = db.getOrderById(reference);
    if (order && order.status !== 'PAID') {
      order.status = 'PAID';
      order.paystackRef = reference;
      order.paidAt = new Date().toISOString();
      db.saveOrder(order);
      await emailService.sendOrderConfirmationEmails(order);
    }
  }
  res.sendStatus(200);
});

// ==================== CONSULTATION & CALENDAR API ==================== //
app.post('/api/consultation', async (req, res) => {
  try {
    const { name, email, phone, type, message, date } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const startDateTime = date ? new Date(date) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const title = `${type || 'Beauty'} Consultation with Flourish Poppies`;
    const description = `Consultation session for ${name || 'Client'}.\nPhone: ${phone || 'N/A'}\nType: ${type}\nMessage: ${message || 'None'}`;

    let icsContent = null;
    try {
      icsContent = await calendarService.createCalendarEvent({
        title,
        description,
        startDateTime,
        durationHours: 1
      });
    } catch (calErr) {
      console.error('ICS generation warning:', calErr.message);
    }

    const googleCalUrl = calendarService.generateGoogleCalendarUrl({
      title,
      description,
      startDateTime,
      durationHours: 1
    });

    // Send Emails with calendar invite
    await emailService.sendConsultationEmails({
      name,
      email,
      phone,
      type,
      date: startDateTime.toLocaleString(),
      message,
      icsContent,
      googleCalUrl
    });

    res.json({
      success: true,
      message: 'Consultation request booked successfully! Calendar invitation has been emailed to you.',
      googleCalUrl
    });
  } catch (err) {
    console.error('Consultation error:', err);
    res.status(500).json({ error: 'Failed to process consultation request' });
  }
});

// ==================== CONTACT API ==================== //
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const subject = encodeURIComponent(`New contact message from ${name || 'Client'}`);
    const emailBody = encodeURIComponent(`Name: ${name || 'Client'}\nEmail: ${email || ''}\n\nMessage:\n${message || ''}`);
    const mailtoLink = `mailto:${process.env.COMPANY_EMAIL || 'blessedbestone@gmail.com'}?subject=${subject}&body=${emailBody}`;
    res.json({ ok: true, mailtoLink });
  } catch (err) {
    res.status(400).json({ error: 'Invalid contact request' });
  }
});

// Catch-all static route fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'main', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🌸 Flourish Poppies Server running on http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
