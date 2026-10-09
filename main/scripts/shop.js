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

// Fixed formatCad: Calculates CAD from Naira price at 1 CAD = 1250 NGN rate
function formatCad(priceInNaira) {
  const amountInNaira = normalizePrice(priceInNaira);
  const cadAmount = amountInNaira / 1250;
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(cadAmount);
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

// Trigger Rose Petals animation when adding to cart
function triggerRosePetalAnimation(event, product) {
  const cart = JSON.parse(localStorage.getItem('flourishCart') || '[]');
  const normalizedProduct = { ...product, price: normalizePrice(product.price) };
  const existingIndex = cart.findIndex((item) => String(item.id) === String(normalizedProduct.id));

  if (existingIndex >= 0) {
    cart[existingIndex].qty = Number(cart[existingIndex].qty || 1) + 1;
  } else {
    cart.push({ ...normalizedProduct, qty: 1 });
  }

  localStorage.setItem('flourishCart', JSON.stringify(cart));

  // Update cart badges
  const countBadges = document.querySelectorAll('[data-cart-count], #cartCount, #detailCartBadge');
  const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
  countBadges.forEach(b => { if (b) b.textContent = totalItems; });

  // Floating rose petal particles shower
  const clickX = event ? event.clientX : window.innerWidth / 2;
  const clickY = event ? event.clientY : window.innerHeight / 2;

  const petalsContainer = document.createElement('div');
  petalsContainer.style.position = 'fixed';
  petalsContainer.style.inset = '0';
  petalsContainer.style.pointerEvents = 'none';
  petalsContainer.style.zIndex = '9999';
  document.body.appendChild(petalsContainer);

  const icons = ['🌸', '🌹', '✨', '💖', '🥀'];
  for (let i = 0; i < 20; i++) {
    const petal = document.createElement('span');
    petal.textContent = icons[Math.floor(Math.random() * icons.length)];
    petal.style.position = 'fixed';
    petal.style.left = `${clickX + (Math.random() * 160 - 80)}px`;
    petal.style.top = `${clickY + (Math.random() * 40 - 20)}px`;
    petal.style.fontSize = `${16 + Math.random() * 16}px`;
    petal.style.opacity = '1';
    petal.style.transition = 'transform 1.3s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 1.3s ease-out';
    petalsContainer.appendChild(petal);

    const destX = (Math.random() * 320 - 160);
    const destY = -(140 + Math.random() * 220);
    const rot = (Math.random() * 720 - 360);

    requestAnimationFrame(() => {
      petal.style.transform = `translate(${destX}px, ${destY}px) rotate(${rot}deg)`;
      petal.style.opacity = '0';
    });
  }

  setTimeout(() => {
    if (petalsContainer && petalsContainer.parentNode) {
      petalsContainer.parentNode.removeChild(petalsContainer);
    }
  }, 1500);

  // Show Rose Gold Toast
  showRoseGoldToast(`✨ ${product.name} added to cart!`);
}

function showRoseGoldToast(message) {
  let toast = document.getElementById('roseGoldToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'roseGoldToast';
    toast.className = 'fixed bottom-6 right-6 z-50 rounded-2xl bg-gradient-to-r from-[#2a0e2a] via-[#1a0928] to-[#2a0e2a] border border-amber-300/60 p-4 text-white shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-10 opacity-0';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span class="text-2xl">🌸</span>
    <div>
      <p class="font-bold text-amber-200 text-sm">${message}</p>
      <a href="cart.html" class="text-xs font-semibold text-white underline hover:text-amber-300">View Shopping Cart ➔</a>
    </div>
  `;

  toast.classList.remove('translate-y-10', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
  }, 3500);
}

function addToCart(product) {
  triggerRosePetalAnimation(null, product);
}

async function renderShopProducts() {
  const container = document.getElementById('shopProducts');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const selectedProductId = params.get('product') || params.get('id');
  let products = getAllProducts();

  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length) {
        products = data.products.map(p => ({ ...p, price: normalizePrice(p.price) }));
      }
    }
  } catch (err) {}

  const isMultiColMobile = products.length > 8;

  if (isMultiColMobile) {
    container.className = "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8";
  } else {
    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8";
  }

  container.innerHTML = products.map((product) => {
    const isSelected = String(product.id) === String(selectedProductId);
    return `
      <article class="product-card group relative rounded-3xl bg-white ${isMultiColMobile ? 'p-3 sm:p-5' : 'p-5'} shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-amber-100/80 flex flex-col justify-between ${isSelected ? 'ring-2 ring-amber-500' : ''}" data-product-id="${product.id}">
        <div>
          <a href="product-detail.html?id=${product.id}" class="block relative overflow-hidden rounded-2xl aspect-square bg-[#fffaf5]">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            ${product.sold ? '<span class="absolute top-2 left-2 sm:top-3 sm:left-3 bg-rose-500 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow">Sold Out</span>' : ''}
          </a>
          <div class="mt-3 sm:mt-4">
            <span class="inline-block rounded-full bg-amber-100/80 px-2.5 sm:px-3 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-amber-900 border border-amber-200/60">${product.category || 'Beauty'}</span>
            <h3 class="mt-1.5 sm:mt-2 text-sm sm:text-lg font-bold text-slate-900 heading line-clamp-1">${product.name}</h3>
            <p class="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2">${product.description || ''}</p>
            <div class="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-amber-100/60 flex items-baseline justify-between">
              <div>
                <span class="text-sm sm:text-lg font-extrabold text-slate-950 block">${formatPrice(product.price)}</span>
                <span class="text-[10px] sm:text-xs font-bold text-amber-700 block">${formatCad(product.price)} CAD</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-3 sm:mt-5 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 w-full">
          <button type="button" class="w-full sm:flex-1 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-extrabold px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs shadow-md hover:shadow-amber-400/40 hover:scale-[1.02] active:scale-95 transition-all text-center whitespace-nowrap" onclick="triggerRosePetalAnimation(event, getProductById('${product.id}'))">
            Add to Cart 🌸
          </button>
          <a href="cart.html" class="w-full sm:flex-1 text-center rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 px-2 sm:px-3 py-2 sm:py-3 text-[10px] sm:text-xs font-bold text-slate-800 hover:bg-slate-100 transition whitespace-nowrap">View Cart 🛒</a>
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
        <p class="text-xs uppercase tracking-[0.35em] text-amber-600 font-bold">Bluepoppies Cosmetics</p>
        <h1 class="heading text-4xl md:text-5xl font-bold text-slate-900 mt-3">${product.name}</h1>
        <p class="text-sm uppercase tracking-[0.25em] text-gray-500 mt-2">${product.category}</p>
        <p class="mt-5 text-gray-700 leading-7">${product.details || product.description || ''}</p>
        <p class="mt-6 text-3xl font-bold text-slate-950">${formatPrice(product.price)}</p>
        <p class="mt-2 text-amber-800 font-bold">${formatCad(product.price)} CAD</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button type="button" class="rounded-2xl bg-amber-400 text-blue-950 font-extrabold px-6 py-3.5 hover:bg-amber-300 shadow-md transition" onclick="triggerRosePetalAnimation(event, getProductById('${product.id}'))">Add to cart 🌸</button>
          <a href="cart.html" class="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-slate-900 font-semibold hover:bg-slate-50">View cart</a>
        </div>
      </div>
    </div>
  `;
}

function renderCart() {
  const cart = JSON.parse(localStorage.getItem('flourishCart') || '[]');
  const container = document.getElementById('cartItems');
  const subtotal = document.getElementById('cartSubtotal');
  const cadSubtotal = document.getElementById('cartCadSubtotal');
  const count = document.getElementById('cartCount');

  if (!container) return;

  if (!cart.length) {
    container.innerHTML = '<p class="text-gray-600">Your cart is empty. Start with one of our beauty essentials.</p>';
    if (subtotal) subtotal.textContent = formatPrice(0);
    if (cadSubtotal) cadSubtotal.textContent = formatCad(0);
    if (count) count.textContent = '0 items';
    return;
  }

  const total = cart.reduce((sum, item) => sum + normalizePrice(item.price) * Number(item.qty || 1), 0);

  container.innerHTML = cart.map((item) => `
    <article class="rounded-3xl border border-amber-100 bg-white p-5 shadow-xl flex flex-col md:flex-row gap-5 md:items-center justify-between">
      <div class="flex gap-4 items-center">
        <img src="${item.image}" alt="${item.name}" class="h-24 w-24 rounded-2xl object-cover">
        <div>
          <h3 class="text-xl font-semibold text-slate-950">${item.name}</h3>
          <p class="text-sm text-gray-600">${item.category}</p>
          <p class="text-sm text-blue-900 font-bold">${formatPrice(item.price)} <span class="text-xs text-amber-700">(${formatCad(item.price)} CAD)</span> each</p>
        </div>
      </div>
      <div class="text-sm text-gray-700 font-bold">Qty: ${item.qty}</div>
      <div class="text-right">
        <div class="text-lg font-bold text-slate-950">${formatPrice(normalizePrice(item.price) * Number(item.qty || 1))}</div>
        <div class="text-xs font-semibold text-amber-700">(${formatCad(normalizePrice(item.price) * Number(item.qty || 1))} CAD)</div>
      </div>
    </article>
  `).join('');

  if (subtotal) subtotal.textContent = formatPrice(total);
  if (cadSubtotal) cadSubtotal.textContent = formatCad(total) + ' CAD';
  if (count) count.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''}`;
}

window.addToCart = addToCart;
window.triggerRosePetalAnimation = triggerRosePetalAnimation;

document.addEventListener('DOMContentLoaded', () => {
  renderShopProducts();
  renderProductDetail();
  renderCart();
});
