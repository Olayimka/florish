const fs = require('fs');
const path = require('path');

const storageDir = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

function getFilePath(filename) {
  return path.join(storageDir, filename);
}

function readJsonFile(filename, defaultValue = []) {
  const file = getFilePath(filename);
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
  return defaultValue;
}

function writeJsonFile(filename, data) {
  const file = getFilePath(filename);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error.message);
    return false;
  }
}

// Default Products (Keeping 1 test product for testing)
const defaultProducts = [
  {
    id: 1,
    name: 'Poppy Dew Lip Gloss',
    category: 'Beauty',
    price: 12500,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600',
    description: 'A luminous gloss for glowing bridal portraits and special occasions.',
    details: 'Soft shimmer, nourishing formula, and a satin finish that photographs beautifully for every bridal moment.',
    sold: false
  }
];

// Product Store
function getProducts() {
  const products = readJsonFile('products.json', null);
  if (!products || !products.length) {
    writeJsonFile('products.json', defaultProducts);
    return defaultProducts;
  }
  return products;
}

function saveProducts(products) {
  return writeJsonFile('products.json', products);
}

// Cart Store
function getCart(sessionId) {
  const carts = readJsonFile('carts.json', {});
  return carts[sessionId] || [];
}

function saveCart(sessionId, cartItems) {
  const carts = readJsonFile('carts.json', {});
  carts[sessionId] = cartItems;
  writeJsonFile('carts.json', carts);
  return cartItems;
}

// Orders Store
function getOrders() {
  return readJsonFile('orders.json', []);
}

function getOrderById(orderRef) {
  const orders = getOrders();
  return orders.find(o => o.orderRef === orderRef || o.paystackRef === orderRef);
}

function saveOrder(order) {
  const orders = getOrders();
  const existingIndex = orders.findIndex(o => o.orderRef === order.orderRef);
  if (existingIndex >= 0) {
    orders[existingIndex] = { ...orders[existingIndex], ...order };
  } else {
    orders.unshift(order);
  }
  writeJsonFile('orders.json', orders);
  return order;
}

// OTP Store
const activeOTPs = new Map();

function storeOTP(email, code) {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  activeOTPs.set(email.toLowerCase().trim(), { code: String(code), expiresAt });
}

function verifyOTP(email, code) {
  const record = activeOTPs.get(email.toLowerCase().trim());
  if (!record) return { valid: false, reason: 'No OTP requested for this email' };
  if (Date.now() > record.expiresAt) {
    activeOTPs.delete(email.toLowerCase().trim());
    return { valid: false, reason: 'OTP expired. Please request a new one.' };
  }
  if (record.code !== String(code).trim()) {
    return { valid: false, reason: 'Invalid OTP code' };
  }
  activeOTPs.delete(email.toLowerCase().trim());
  return { valid: true };
}

module.exports = {
  getProducts,
  saveProducts,
  getCart,
  saveCart,
  getOrders,
  getOrderById,
  saveOrder,
  storeOTP,
  verifyOTP
};
