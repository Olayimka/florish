const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass }
    });
  }
  return null;
}

async function sendOTPEmail(email, otpCode) {
  const companyName = process.env.COMPANY_NAME || 'Flourish Poppies';
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #fffaf5;">
      <h2 style="color: #1e3a8a; text-align: center;">${companyName} Checkout</h2>
      <p style="color: #333; font-size: 16px;">Hello,</p>
      <p style="color: #333; font-size: 15px;">Your one-time verification code for completing your checkout is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a; background: #e0e7ff; padding: 10px 24px; border-radius: 8px; display: inline-block;">${otpCode}</span>
      </div>
      <p style="color: #666; font-size: 13px; text-align: center;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP DEMO MODE] To: ${email}`);
    console.log(`OTP Code: ${otpCode}`);
    console.log(`========================================\n`);
    return { success: true, mode: 'demo', otpCode };
  }

  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Your ${companyName} Checkout Verification Code: ${otpCode}`,
    html
  });

  return { success: true, mode: 'smtp' };
}

async function sendOrderConfirmationEmails(order) {
  const companyEmail = process.env.COMPANY_EMAIL || 'blessedbestone@gmail.com';
  const companyName = process.env.COMPANY_NAME || 'Flourish Poppies';
  const transporter = createTransporter();

  const itemsHtml = (order.cart || []).map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${(item.price * (item.qty || 1)).toLocaleString()}</td>
    </tr>
  `).join('');

  // 1. Buyer Receipt HTML
  const buyerHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a;">Order Confirmed! 🎉</h2>
      <p>Thank you for shopping with <strong>${companyName}</strong>.</p>
      <p><strong>Order Reference:</strong> ${order.orderRef}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <h3 style="text-align: right; color: #1e3a8a; margin-top: 20px;">Total Paid: ₦${Number(order.total || 0).toLocaleString()}</h3>
      <p style="color: #666; font-size: 14px;">We will process your delivery shortly.</p>
    </div>
  `;

  // 2. Company Notification HTML
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #f0f9ff;">
      <h2 style="color: #0369a1;">🛍️ New Order Received!</h2>
      <p><strong>Customer Name:</strong> ${order.customerName || 'Customer'}</p>
      <p><strong>Customer Email:</strong> ${order.customerEmail}</p>
      <p><strong>Phone / Delivery:</strong> ${order.customerPhone || 'N/A'}</p>
      <p><strong>Order Reference:</strong> ${order.orderRef}</p>
      <p><strong>Paystack Reference:</strong> ${order.paystackRef || 'N/A'}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #e0f2fe;">
            <th style="padding: 10px; text-align: left;">Item</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <h3 style="text-align: right; color: #0369a1; margin-top: 20px;">Total Amount: ₦${Number(order.total || 0).toLocaleString()}</h3>
    </div>
  `;

  if (!transporter) {
    console.log(`\n========================================`);
    console.log(`[ORDER EMAIL DEMO MODE] New Order Paid: ${order.orderRef}`);
    console.log(`Buyer: ${order.customerEmail} | Amount: ₦${order.total}`);
    console.log(`Company Admin Notified: ${companyEmail}`);
    console.log(`========================================\n`);
    return { success: true, mode: 'demo' };
  }

  // Send email to buyer
  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: order.customerEmail,
    subject: `Order Confirmation - ${order.orderRef} | ${companyName}`,
    html: buyerHtml
  });

  // Send email to company admin
  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: companyEmail,
    subject: `NEW ORDER: ₦${Number(order.total || 0).toLocaleString()} from ${order.customerEmail} (${order.orderRef})`,
    html: adminHtml
  });

  return { success: true, mode: 'smtp' };
}

async function sendConsultationEmails({ name, email, phone, type, date, message, icsContent, googleCalUrl }) {
  const companyEmail = process.env.COMPANY_EMAIL || 'blessedbestone@gmail.com';
  const companyName = process.env.COMPANY_NAME || 'Flourish Poppies';
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; background-color: #fffaf5;">
      <h2 style="color: #1e3a8a;">📅 Consultation Request Scheduled</h2>
      <p>Hello <strong>${name || 'Client'}</strong>,</p>
      <p>Your consultation booking with <strong>${companyName}</strong> has been logged!</p>
      <ul style="line-height: 1.8;">
        <li><strong>Service Type:</strong> ${type || 'General Consultation'}</li>
        <li><strong>Scheduled Date/Time:</strong> ${date || 'To be confirmed'}</li>
        <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
        <li><strong>Notes:</strong> ${message || 'None'}</li>
      </ul>
      <div style="margin: 20px 0; text-align: center;">
        <a href="${googleCalUrl}" target="_blank" style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Add to Google Calendar 📅</a>
      </div>
      <p style="font-size: 13px; color: #666;">We have attached a calendar invite file (.ics) to this email for Apple Calendar & Outlook.</p>
    </div>
  `;

  if (!transporter) {
    console.log(`\n========================================`);
    console.log(`[CONSULTATION DEMO MODE] Client: ${email} (${name})`);
    console.log(`Type: ${type} | Date: ${date}`);
    console.log(`Google Calendar URL: ${googleCalUrl}`);
    console.log(`========================================\n`);
    return { success: true, mode: 'demo' };
  }

  const attachments = icsContent ? [{
    filename: 'consultation-invite.ics',
    content: icsContent,
    contentType: 'text/calendar'
  }] : [];

  // Send to Client
  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Consultation Confirmed: ${type || 'Beauty Consultation'} with ${companyName}`,
    html,
    attachments
  });

  // Send to Company Admin
  await transporter.sendMail({
    from: `"${companyName}" <${process.env.SMTP_USER}>`,
    to: companyEmail,
    subject: `NEW CONSULTATION BOOKING: ${name} (${type})`,
    html,
    attachments
  });

  return { success: true, mode: 'smtp' };
}

module.exports = {
  sendOTPEmail,
  sendOrderConfirmationEmails,
  sendConsultationEmails
};
