const SHOP_PRODUCTS = [
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

function normalizePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value ?? '').replace(/[^\d.-]/g, '').replace(/,/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(normalizePrice(value));
}

function formatCad(value) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(normalizePrice(value));
}

function getConvertedPrices(value) {
  const amount = normalizePrice(value);
  const cad = amount / 1250;
  return { cad };
}

function getStoredProducts() {
  const saved = JSON.parse(localStorage.getItem('flourishProducts') || '[]');
  if (!Array.isArray(saved)) return [];
  return saved.map((item, index) => ({
    ...item,
    id: item.id ?? `custom-${index + 1}`,
    price: normalizePrice(item.price)
  }));
}

function getAllProducts() {
  return [...getStoredProducts(), ...SHOP_PRODUCTS.map((product) => ({ ...product, price: normalizePrice(product.price) }))];
}

function getProductById(id) {
  return getAllProducts().find((item) => String(item.id) === String(id)) || getAllProducts()[0] || SHOP_PRODUCTS[0];
}

function addToCart(product) {
  const cart = JSON.parse(localStorage.getItem('flourishCart') || '[]');
  const normalizedProduct = { ...product, price: normalizePrice(product.price) };
  const existingIndex = cart.findIndex((item) => String(item.id) === String(normalizedProduct.id));

  if (existingIndex >= 0) {
    cart[existingIndex].qty = Number(cart[existingIndex].qty || 1) + 1;
  } else {
    cart.push({ ...normalizedProduct, qty: 1 });
  }

  localStorage.setItem('flourishCart', JSON.stringify(cart));
  window.location.href = 'cart.html';
}

function renderShopProducts() {
  const container = document.getElementById('shopProducts');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const selectedProductId = params.get('product');
  const products = getAllProducts();

  container.innerHTML = products.map((product) => {
    const converted = getConvertedPrices(product.price);
    const isSelected = String(product.id) === String(selectedProductId);
    return `
      <article class="product-card rounded-3xl bg-white p-4 shadow-xl hover:-translate-y-1 transition ${isSelected ? 'ring-2 ring-blue-800' : ''}" data-product-id="${product.id}">
        <a href="product-detail.html?id=${product.id}" class="block">
          <img src="${product.image}" alt="${product.name}" class="h-56 w-full rounded-2xl object-cover">
        </a>
        <span class="category mt-4 block text-xs uppercase tracking-[0.25em] text-gray-500">${product.category}</span>
        <h3 class="mt-2 text-xl font-semibold text-blue-950">${product.name}</h3>
        <p class="price mt-3 text-blue-800 font-semibold">${formatPrice(product.price)}</p>
        <p class="mt-1 text-sm text-gray-600">${formatCad(converted.cad)}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="product-detail.html?id=${product.id}" class="inline-flex rounded-full bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">View details</a>
          <button type="button" class="inline-flex rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50" onclick="addToCart(getProductById('${product.id}'))">Add to cart</button>
        </div>
      </article>
    `;
  }).join('');

  if (selectedProductId) {
    const selectedCard = container.querySelector(`[data-product-id="${selectedProductId}"]`);
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function renderProductDetail() {
  const detail = document.getElementById('productDetail');
  if (!detail) return;

  const params = new URLSearchParams(window.location.search);
  const product = getProductById(params.get('id'));

  detail.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-10 items-center">
      <img src="${product.image}" alt="${product.name}" class="rounded-3xl shadow-2xl h-[420px] object-cover">
      <div>
        <p class="text-xs uppercase tracking-[0.35em] text-blue-800">Blue Poppies</p>
        <h1 class="heading text-4xl md:text-5xl font-bold text-blue-950 mt-3">${product.name}</h1>
        <p class="text-sm uppercase tracking-[0.25em] text-gray-500 mt-2">${product.category}</p>
        <p class="mt-5 text-gray-700 leading-7">${product.details || product.description || ''}</p>
        <p class="mt-6 text-3xl font-bold text-blue-900">${formatPrice(product.price)}</p>
        <p class="mt-2 text-gray-600">${formatCad(getConvertedPrices(product.price).cad)}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button type="button" class="rounded-2xl bg-blue-800 px-5 py-3 text-white font-semibold hover:bg-blue-900" onclick="addToCart(getProductById('${product.id}'))">Add to cart</button>
          <a href="cart.html" class="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-900 font-semibold hover:bg-blue-100">View cart</a>
        </div>
      </div>
    </div>
  `;
}

function renderCart() {
  const cart = JSON.parse(localStorage.getItem('flourishCart') || '[]');
  const container = document.getElementById('cartItems');
  const subtotal = document.getElementById('cartSubtotal');
  const count = document.getElementById('cartCount');

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = '<p class="text-gray-600">Your cart is empty. Start with one of our beauty essentials.</p>';
    if (subtotal) subtotal.textContent = formatPrice(0);
    if (count) count.textContent = '0 items';
    return;
  }

  const total = cart.reduce((sum, item) => sum + normalizePrice(item.price) * Number(item.qty || 1), 0);

  container.innerHTML = cart.map((item) => `
    <article class="rounded-3xl border border-amber-100 bg-white p-5 shadow-xl flex flex-col md:flex-row gap-5 md:items-center justify-between">
      <div class="flex gap-4 items-center">
        <img src="${item.image}" alt="${item.name}" class="h-24 w-24 rounded-2xl object-cover">
        <div>
          <h3 class="text-xl font-semibold text-blue-950">${item.name}</h3>
          <p class="text-sm text-gray-600">${item.category}</p>
          <p class="text-sm text-blue-800 font-semibold">${formatPrice(item.price)} each</p>
        </div>
      </div>
      <div class="text-sm text-gray-700">Qty: ${item.qty}</div>
      <div class="text-lg font-semibold text-blue-900">${formatPrice(normalizePrice(item.price) * Number(item.qty || 1))}</div>
    </article>
  `).join('');

  if (subtotal) subtotal.textContent = formatPrice(total);
  if (count) count.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''}`;
}

window.addToCart = addToCart;

renderShopProducts();
renderProductDetail();
renderCart();
