const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'main');
const port = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
  const resolvedPath = path.resolve(publicDir, filePath);
  if (!resolvedPath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found' });
      } else {
        sendJson(res, 500, { error: 'Server error' });
      }
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getProducts() {
  const fallbackProducts = [
    {
      id: 1,
      name: 'Poppy Dew Lip Gloss',
      category: 'Beauty',
      price: 12500,
      image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600',
      description: 'A luminous gloss for glowing bridal portraits and special occasions.',
      details: 'Soft shimmer, nourishing formula, and a satin finish that photographs beautifully for every bridal moment.'
    },
    {
      id: 2,
      name: 'Gilded Glow Shimmer Oil',
      category: 'Body',
      price: 18000,
      image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600',
      description: 'A polished shimmer finish for events, photos, and elegant evenings.',
      details: 'Lightweight glow oil with silky hydration, perfect for bridal prep or evening events.'
    },
    {
      id: 3,
      name: 'Velvet Muse Palette',
      category: 'Beauty',
      price: 25000,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600',
      description: 'Soft matte tones made for flawless bridal and event styling.',
      details: 'Buildable soft matte shades designed for classic bridal looks and refined event make-up.'
    },
    {
      id: 4,
      name: 'Hydra-Flourish Serum',
      category: 'Skincare',
      price: 32000,
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600',
      description: 'Hydrating care that keeps your glow fresh before every celebration.',
      details: 'A silky serum to prep skin pre-bridal, event, and photo sessions for a luminous finish.'
    }
  ];

  const filePath = path.join(rootDir, 'storage', 'products.json');
  try {
    if (fs.existsSync(filePath)) {
      const stored = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(stored) && stored.length ? stored : fallbackProducts;
    }
  } catch {
    // ignore and use fallback
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(fallbackProducts, null, 2));
  return fallbackProducts;
}

function saveProducts(products) {
  const filePath = path.join(rootDir, 'storage', 'products.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/api/products') {
    if (req.method === 'GET') {
      sendJson(res, 200, { products: getProducts() });
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const products = getProducts();
        const nextProduct = {
          id: Date.now(),
          name: body.name || 'New Product',
          category: body.category || 'New Upload',
          price: Number(body.price) || 15000,
          image: body.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
          description: body.description || 'Freshly uploaded product.',
          details: body.details || body.description || 'Freshly uploaded product.'
        };
        products.unshift(nextProduct);
        saveProducts(products);
        sendJson(res, 201, { product: nextProduct, products });
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  if (pathname === '/api/products/update') {
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const products = getProducts();
        const index = products.findIndex((product) => String(product.id) === String(body.id));
        if (index >= 0) {
          products[index] = { ...products[index], ...body, price: Number(body.price) || products[index].price };
          saveProducts(products);
          sendJson(res, 200, { products });
        } else {
          sendJson(res, 404, { error: 'Product not found' });
        }
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  if (pathname === '/api/products/delete') {
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const products = getProducts().filter((product) => String(product.id) !== String(body.id));
        saveProducts(products);
        sendJson(res, 200, { products });
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  if (pathname === '/api/consultation') {
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const subject = encodeURIComponent(`New consultation request from ${body.name || 'Client'}`);
        const emailBody = encodeURIComponent(`Name: ${body.name || 'Client'}\nEmail: ${body.email || ''}\nPhone: ${body.phone || ''}\nType: ${body.type || 'Consultation'}\n\nMessage:\n${body.message || ''}`);
        const mailtoLink = `mailto:blessedbestone@gmail.com?subject=${subject}&body=${emailBody}`;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, mailtoLink }));
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  if (pathname === '/api/contact') {
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const subject = encodeURIComponent(`New contact form message from ${body.name || 'Client'}`);
        const emailBody = encodeURIComponent(`Name: ${body.name || 'Client'}\nEmail: ${body.email || ''}\n\nMessage:\n${body.message || ''}`);
        const mailtoLink = `mailto:blessedbestone@gmail.com?subject=${subject}&body=${emailBody}`;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, mailtoLink }));
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  if (pathname === '/api/checkout') {
    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const cart = Array.isArray(body.cart) ? body.cart : [];
        const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
        sendJson(res, 200, { ok: true, total, orderRef: `FLR-${Date.now()}` });
      } catch {
        sendJson(res, 400, { error: 'Invalid request body' });
      }
      return;
    }
  }

  let requestedPath = pathname === '/' ? '/index.html' : pathname;
  if (requestedPath.startsWith('/main/')) {
    requestedPath = requestedPath.replace(/^\/main\//, '');
  } else {
    requestedPath = requestedPath.replace(/^\//, '');
  }
  serveStaticFile(res, requestedPath);
});

server.listen(port, () => {
  console.log(`Flourish Poppies running on http://localhost:${port}`);
});
