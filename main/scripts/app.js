(function () {
  const CALENDLY_URL = 'https://calendly.com/blessedbestone/beauty-consultation';
  const PRODUCTS_KEY = 'flourishProducts';
  const CART_KEY = 'flourishCart';
  const ORDERS_KEY = 'flourishOrders';
  const PRODUCT_API_URL = '/api/products';
  const CONTACT_API_URL = '/api/contact';
  const CONSULTATION_API_URL = '/api/consultation';
  const CHECKOUT_API_URL = '/api/checkout';

  const fallbackProducts = [
    {
      id: 1,
      name: 'Poppy Dew Lip Gloss',
      category: 'Beauty',
      price: 12500,
      image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600',
      description: 'A luminous gloss for glowing bridal portraits and special occasions.',
      details: 'Soft shimmer, nourishing formula, and a satin finish that photographs beautifully for every bridal moment.',
      sold: false
    },
    {
      id: 2,
      name: 'Gilded Glow Shimmer Oil',
      category: 'Body',
      price: 18000,
      image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600',
      description: 'A polished shimmer finish for events, photos, and elegant evenings.',
      details: 'Lightweight glow oil with silky hydration, perfect for bridal prep or evening events.',
      sold: true
    },
    {
      id: 3,
      name: 'Velvet Muse Palette',
      category: 'Beauty',
      price: 25000,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600',
      description: 'Soft matte tones made for flawless bridal and event styling.',
      details: 'Buildable soft matte shades designed for classic bridal looks and refined event make-up.',
      sold: false
    },
    {
      id: 4,
      name: 'Hydra-Flourish Serum',
      category: 'Skincare',
      price: 32000,
      image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600',
      description: 'Hydrating care that keeps your glow fresh before every celebration.',
      details: 'A silky serum to prep skin pre-bridal, event, and photo sessions for a luminous finish.',
      sold: false
    }
  ];

  function parsePrice(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value) return 0;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatPrice(value) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(parsePrice(value));
  }

  function formatCad(priceInNgn) {
    const rawNgn = parsePrice(priceInNgn);
    const cadAmount = rawNgn / 1250;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(cadAmount);
  }

  function readProductsFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || 'null');
      return Array.isArray(saved) && saved.length ? saved : fallbackProducts;
    } catch {
      return fallbackProducts;
    }
  }

  function writeProductsToStorage(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function getProducts() {
    return readProductsFromStorage();
  }

  function getProductById(id) {
    return getProducts().find((item) => String(item.id) === String(id)) || fallbackProducts[0];
  }

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    syncCartWithServer(cart);
  }

  async function syncCartWithServer(cart) {
    try {
      let sessionId = localStorage.getItem('flourishSessionId');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('flourishSessionId', sessionId);
      }
      await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, cart })
      });
    } catch {
      /* fallback to local storage silently */
    }
  }

  function updateCartBadge() {
    const count = getCart().reduce((sum, item) => sum + Number(item.qty || 1), 0);
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = count;
    });
  }

  function showToast(message) {
    const existing = document.getElementById('flourishToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'flourishToast';
    toast.className = 'fixed bottom-4 right-4 z-[120] rounded-2xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2200);
  }

  function addToCart(product, qty = 1) {
    const cart = getCart();
    const existingIndex = cart.findIndex((item) => String(item.id) === String(product.id));
    if (existingIndex >= 0) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({ ...product, qty });
    }
    saveCart(cart);
    showToast(`${product.name} added to cart`);
    return cart;
  }

  function updateCartItem(productId, qty) {
    const cart = getCart().map((item) => (String(item.id) === String(productId) ? { ...item, qty } : item)).filter((item) => item.qty > 0);
    saveCart(cart);
    return cart;
  }

  function removeCartItem(productId) {
    const cart = getCart().filter((item) => String(item.id) !== String(productId));
    saveCart(cart);
    return cart;
  }

  async function syncProductsFromServer() {
    try {
      const response = await fetch(PRODUCT_API_URL);
      if (!response.ok) return;
      const data = await response.json();
      const incomingProducts = Array.isArray(data.products) ? data.products : [];
      if (incomingProducts.length) {
        writeProductsToStorage(incomingProducts);
      }
    } catch {
      /* fall back to storage */
    }
  }

  async function createProduct(productPayload) {
    try {
      const response = await fetch(PRODUCT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      if (response.ok) {
        const data = await response.json();
        const updatedList = data.products || [data.product, ...getProducts()];
        writeProductsToStorage(updatedList);
        return data.product || productPayload;
      }
    } catch (err) {
      console.warn('Server create API unavailable, using local storage:', err);
    }
    const current = getProducts();
    const newProd = { id: Date.now(), ...productPayload };
    current.unshift(newProd);
    writeProductsToStorage(current);
    return newProd;
  }

  async function updateProduct(productPayload) {
    try {
      const response = await fetch('/api/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      if (response.ok) {
        const data = await response.json();
        if (data.products) {
          writeProductsToStorage(data.products);
          return data.products;
        }
      }
    } catch (err) {
      console.warn('Server update API unavailable, using local storage:', err);
    }
    const current = getProducts();
    const idx = current.findIndex(p => String(p.id) === String(productPayload.id));
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...productPayload };
      writeProductsToStorage(current);
    }
    return current;
  }

  async function deleteProduct(productId) {
    try {
      const response = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          writeProductsToStorage(data.products);
          return data.products;
        }
      }
    } catch (err) {
      console.warn('Server delete API unavailable, using local storage:', err);
    }
    const remaining = getProducts().filter(p => String(p.id) !== String(productId));
    writeProductsToStorage(remaining);
    return remaining;
  }

  function triggerBlowKissAnimation() {
    const existing = document.getElementById('kissThankYouModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'kissThankYouModal';
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300';
    modal.innerHTML = `
      <div class="relative w-full max-w-md bg-gradient-to-b from-white via-[#fffaf5] to-[#fef7f0] rounded-3xl p-8 text-center shadow-2xl border border-amber-300/60 overflow-hidden transform transition-all duration-300 scale-95 opacity-0" id="kissModalContent">
        
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-pink-300/30 to-amber-300/30 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center rounded-full bg-gradient-to-tr from-pink-100 via-amber-50 to-pink-50 border-2 border-amber-300/70 shadow-md">
          <span class="text-5xl transform inline-block transition-transform duration-300 hover:scale-110 animate-bounce">😘</span>
          <span class="absolute -right-2 -top-1 text-3xl animate-ping opacity-75">💋</span>
        </div>

        <h3 class="heading text-2xl sm:text-3xl font-extrabold text-blue-950 mb-3 tracking-tight">Thank You Gorgeous! 💖</h3>
        
        <p class="text-sm sm:text-base text-slate-700 leading-relaxed font-medium mb-5">
          We have received your message! Our executive team will respond to you within <span class="font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-200">24 hours</span>.
        </p>

        <div class="py-2.5 px-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs font-semibold text-amber-900 inline-flex items-center gap-2 mb-6 shadow-sm">
          <span class="text-sm">💋</span> Sending you love & beauty vibes! <span class="text-sm">✨</span>
        </div>

        <button id="closeKissModalBtn" class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-lg hover:shadow-amber-400/40 hover:brightness-105 active:scale-95 transition-all">
          Close 💋
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      const content = document.getElementById('kissModalContent');
      if (content) {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
      }
    });

    const kissEmojis = ['💋', '😘', '💋✨', '💖', '💋💕', '👄', '💋', '😘💨'];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'fixed pointer-events-none z-[10000] select-none font-bold';
        particle.textContent = kissEmojis[Math.floor(Math.random() * kissEmojis.length)];

        const startX = window.innerWidth / 2 + (Math.random() * 220 - 110);
        const startY = window.innerHeight / 2 + (Math.random() * 120 - 60);

        const deltaX = (Math.random() - 0.5) * 400;
        const deltaY = -(200 + Math.random() * 320);
        const rotation = (Math.random() - 0.5) * 90;
        const fontSize = 24 + Math.random() * 28;
        const duration = 2200 + Math.random() * 1300;

        particle.style.cssText = `
          left: ${startX}px;
          top: ${startY}px;
          font-size: ${fontSize}px;
          opacity: 1;
          transform: translate(0, 0) scale(0.4) rotate(0deg);
          transition: transform ${duration}ms cubic-bezier(0.1, 0.8, 0.3, 1), opacity ${duration}ms ease-out;
          filter: drop-shadow(0 4px 8px rgba(245, 158, 11, 0.4));
        `;

        document.body.appendChild(particle);

        requestAnimationFrame(() => {
          particle.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.5) rotate(${rotation}deg)`;
          particle.style.opacity = '0';
        });

        setTimeout(() => particle.remove(), duration + 100);
      }, i * 65);
    }

    const closeModal = () => {
      const content = document.getElementById('kissModalContent');
      if (content) {
        content.classList.add('scale-95', 'opacity-0');
      }
      modal.classList.add('opacity-0');
      setTimeout(() => modal.remove(), 300);
    };

    const closeBtn = document.getElementById('closeKissModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    setTimeout(() => {
      if (document.body.contains(modal)) closeModal();
    }, 5500);
  }

  async function submitInquiry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await fetch(CONTACT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(() => {});
    } catch (e) {}

    if (form) form.reset();
    triggerBlowKissAnimation();
  }

  async function submitConsultation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(CONSULTATION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not book consultation');
    window.location.href = data.mailtoLink;
    form.reset();
    showToast('Your consultation request is ready to send.');
  }

  function renderShopPage() {
    const container = document.getElementById('shopProducts');
    const landingGrid = document.getElementById('productsGrid');
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (!container && !landingGrid && !inventoryBody) return;

    const products = getProducts();
    const isMultiColMobile = products.length > 8;

    if (container) {
      if (isMultiColMobile) {
        container.className = "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8";
      } else {
        container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8";
      }

      container.innerHTML = products.map((product) => `
        <article class="product-card rounded-3xl bg-white ${isMultiColMobile ? 'p-3 sm:p-5' : 'p-5'} shadow-xl hover:-translate-y-1 transition flex flex-col justify-between">
          <div>
            <a href="product-detail.html?id=${product.id}" class="block relative overflow-hidden rounded-2xl aspect-square w-full">
              <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover">
            </a>
            <span class="category mt-3 sm:mt-4 block text-[9px] sm:text-xs uppercase tracking-[0.25em] text-gray-500">${product.category || 'Beauty'}</span>
            <h3 class="mt-1.5 sm:mt-2 text-sm sm:text-xl font-semibold text-blue-950 line-clamp-1">${product.name}</h3>
            <p class="mt-1 text-xs text-gray-600 line-clamp-2">${product.description || ''}</p>
            <p class="price mt-2.5 sm:mt-3 text-sm sm:text-base text-blue-800 font-semibold">${formatPrice(product.price)} · <span class="text-amber-700 text-xs font-medium">${formatCad(parsePrice(product.price) / 1250)} CAD</span></p>
          </div>
          <div class="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
            <a href="product-detail.html?id=${product.id}" class="w-full sm:flex-1 text-center rounded-xl sm:rounded-full bg-blue-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-blue-900">View details</a>
            <button type="button" class="w-full sm:flex-1 text-center rounded-xl sm:rounded-full border border-blue-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-blue-900 hover:bg-blue-50" data-add-to-cart="${product.id}">Add to cart</button>
          </div>
        </article>
      `).join('');
    }

    if (landingGrid) {
      landingGrid.innerHTML = products.map((product) => `
        <a href="product-detail.html?id=${product.id}" class="product-card block rounded-3xl bg-white p-4 shadow-xl transition hover:-translate-y-1">
          <div class="relative overflow-hidden rounded-2xl aspect-square w-full mb-3">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover">
          </div>
          <span class="category mt-4 block text-xs uppercase tracking-[0.25em] text-gray-500">${product.category || 'Beauty'}</span>
          <h3 class="mt-2 text-xl font-semibold text-blue-950">${product.name}</h3>
          <p class="price mt-2 text-blue-800 font-semibold">${formatPrice(product.price)} · <span class="text-amber-700 font-medium">${formatCad(parsePrice(product.price) / 1250)} CAD</span></p>
          <span class="mt-3 inline-flex rounded-full bg-blue-800 px-4 py-2 text-sm font-semibold text-white">View details</span>
        </a>
      `).join('');
    }

    if (inventoryBody) {
      inventoryBody.innerHTML = products.map((product) => `
        <tr class="border-b border-amber-100 text-sm text-gray-700">
          <td class="py-3 pr-3 font-semibold text-blue-950">${product.name}</td>
          <td class="py-3 pr-3">${product.category || 'Beauty'}</td>
          <td class="py-3 pr-3">${formatPrice(product.price)} (${formatCad(parsePrice(product.price) / 1250)} CAD)</td>
          <td class="py-3 pr-3">
            <span class="rounded-full px-3 py-1 text-xs font-semibold ${product.sold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}">${product.sold ? 'Sold' : 'Available'}</span>
          </td>
        </tr>
      `).join('');
    }
  }

  function renderProductDetailPage() {
    const detail = document.getElementById('productDetail');
    if (!detail) return;

    const params = new URLSearchParams(window.location.search);
    const product = getProductById(params.get('id'));
    detail.innerHTML = `
      <div class="grid lg:grid-cols-2 gap-10 items-center">
        <img src="${product.image}" alt="${product.name}" class="rounded-3xl shadow-2xl h-[420px] object-cover">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-blue-800">Flourish Poppies</p>
          <h1 class="heading text-4xl md:text-5xl font-bold text-blue-950 mt-3">${product.name}</h1>
          <p class="text-sm uppercase tracking-[0.25em] text-gray-500 mt-2">${product.category}</p>
          <p class="mt-5 text-gray-700 leading-7">${product.details || product.description}</p>
          <p class="mt-6 text-3xl font-bold text-blue-900">${formatPrice(product.price)}</p>
          <p class="mt-1 text-sm font-semibold text-amber-700">Approx. ${formatCad(parsePrice(product.price) / 1250)} CAD</p>
          <div class="mt-6 flex flex-wrap gap-3">
            <button type="button" id="detailAddToCart" class="rounded-2xl bg-blue-800 px-5 py-3 text-white font-semibold hover:bg-blue-900" data-add-to-cart="${product.id}">Add to cart</button>
            <a href="cart.html" class="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-900 font-semibold hover:bg-blue-100">View cart</a>
          </div>
        </div>
      </div>
    `;
  }

  function formatCad(value) {
    const num = Number(value || 0);
    const cad = num / 1250;
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(cad);
  }

  function renderCartPage() {
    const container = document.getElementById('cartItems');
    const subtotal = document.getElementById('cartSubtotal');
    const subtotalCad = document.getElementById('cartSubtotalCad');
    const totalCombined = document.getElementById('cartTotalCombined');
    const totalCadNote = document.getElementById('cartTotalCadNote');
    const count = document.getElementById('cartCount');
    if (!container) return;

    const cart = getCart();
    if (!cart.length) {
      container.innerHTML = '<p class="text-slate-600 p-6 text-center">Your cart is empty. Start with one of our beauty essentials.</p>';
      if (subtotal) subtotal.textContent = formatPrice(0);
      if (subtotalCad) subtotalCad.textContent = formatCad(0) + ' CAD';
      if (totalCombined) totalCombined.textContent = formatPrice(0);
      if (totalCadNote) totalCadNote.textContent = formatCad(0) + ' CAD';
      if (count) count.textContent = '0 items';
      return;
    }

    const totalNgn = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    container.innerHTML = cart.map((item) => {
      const itemPrice = Number(item.price || 0);
      const lineTotal = itemPrice * Number(item.qty || 1);
      return `
        <article class="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm flex flex-col md:flex-row gap-5 md:items-center justify-between">
          <div class="flex gap-4 items-center">
            <img src="${item.image}" alt="${item.name}" class="h-20 w-20 rounded-2xl object-cover">
            <div>
              <h3 class="text-lg font-bold text-blue-950">${item.name}</h3>
              <p class="text-xs uppercase tracking-wider text-amber-600 font-semibold">${item.category || 'Beauty'}</p>
              <p class="text-sm text-blue-900 font-bold mt-1">${formatPrice(itemPrice)} <span class="text-xs font-semibold text-amber-700">(${formatCad(itemPrice)} CAD)</span> each</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold hover:bg-slate-100" data-cart-change="${item.id}" data-qty="-1">−</button>
            <span class="text-xs font-bold text-blue-950">Qty ${item.qty}</span>
            <button type="button" class="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold hover:bg-slate-100" data-cart-change="${item.id}" data-qty="1">+</button>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="text-base font-bold text-blue-950">${formatPrice(lineTotal)}</div>
              <div class="text-xs font-semibold text-amber-700">(${formatCad(lineTotal)} CAD)</div>
            </div>
            <button type="button" class="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100" data-cart-remove="${item.id}">Remove</button>
          </div>
        </article>
      `;
    }).join('');

    const cadSubtotal = document.getElementById('cartCadSubtotal');
    if (subtotal) subtotal.textContent = formatPrice(totalNgn);
    if (subtotalCad) subtotalCad.textContent = formatCad(totalNgn) + ' CAD';
    if (cadSubtotal) cadSubtotal.textContent = formatCad(totalNgn) + ' CAD';
    if (totalCombined) totalCombined.textContent = formatPrice(totalNgn);
    if (totalCadNote) totalCadNote.textContent = formatCad(totalNgn) + ' CAD';
    
    const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 1), 0);
    if (count) count.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
  }

  function renderAdminInventory() {
    const tableBody = document.getElementById('adminInventoryTable');
    if (!tableBody) return;
    const products = getProducts();
    if (!products.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-12 text-center text-gray-500">
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3 text-xl">🛍️</div>
            <p class="font-medium">No products in inventory yet.</p>
            <p class="text-xs text-gray-400 mt-1">Use the form above to add your first luxury beauty item.</p>
          </td>
        </tr>
      `;
      return;
    }
    tableBody.innerHTML = products.map((product) => `
      <tr class="border-b border-amber-100/60 text-sm text-gray-700 hover:bg-amber-50/40 transition-colors">
        <td class="py-4 pr-4">
          <div class="flex items-center gap-3.5">
            <img src="${product.image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'}" alt="${product.name}" class="h-12 w-12 rounded-2xl object-cover border border-amber-200/80 shadow-sm shrink-0" />
            <div class="min-w-0">
              <div class="font-bold text-blue-950 truncate max-w-[200px]">${product.name}</div>
              <div class="text-xs text-gray-500 line-clamp-1 max-w-[240px]">${product.description || product.category}</div>
            </div>
          </div>
        </td>
        <td class="py-4 pr-4">
          <span class="inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200/50">${product.category || 'Beauty'}</span>
        </td>
        <td class="py-4 pr-4 whitespace-nowrap">
          <div class="font-bold text-blue-950">${formatPrice(product.price)}</div>
          <div class="text-xs font-semibold text-amber-700 mt-0.5">${formatCad(product.price)} CAD</div>
        </td>
        <td class="py-4 pr-4 whitespace-nowrap">
          <span class="rounded-full px-3 py-1 text-xs font-bold ${product.sold ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
            ${product.sold ? 'Sold' : 'Available'}
          </span>
        </td>
        <td class="py-4 pr-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <button type="button" class="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-800 hover:text-white transition-all shadow-sm" data-edit-product="${product.id}">Edit</button>
            <button type="button" class="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-sm" data-delete-product="${product.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function setupAdminForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    const fileInput = document.getElementById('productImageFile');
    const urlInput = document.getElementById('productImage');
    const productIdInput = document.getElementById('productId');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        category: document.getElementById('productCategory').value.trim() || 'Beauty',
        price: Number(document.getElementById('productPrice').value) || 15000,
        sold: document.getElementById('productSold').checked,
        details: document.getElementById('productDescription').value.trim()
      };

      if (!payload.name || !payload.description) {
        showToast('Please fill the required fields');
        return;
      }

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const dataUrl = await readFileAsDataUrl(fileInput.files[0]);
        payload.image = dataUrl;
      } else if (urlInput && urlInput.value.trim()) {
        payload.image = urlInput.value.trim();
      } else {
        payload.image = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600';
      }

      try {
        if (productIdInput && productIdInput.value) {
          await updateProduct({ ...payload, id: productIdInput.value });
          showToast('Product updated');
        } else {
          await createProduct(payload);
          showToast('Product uploaded');
        }
        form.reset();
        if (productIdInput) productIdInput.value = '';
        if (submitButton) submitButton.textContent = 'Upload product';
        renderAdminInventory();
        renderShopPage();
      } catch (error) {
        showToast(error.message || 'Unable to save product');
      }
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setupAdminActions() {
    document.addEventListener('click', async (event) => {
      const editButton = event.target.closest('[data-edit-product]');
      if (editButton) {
        const productId = editButton.getAttribute('data-edit-product');
        const product = getProductById(productId);
        const form = document.getElementById('productForm');
        if (!form) return;
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productSold').checked = Boolean(product.sold);
        document.getElementById('productImage').value = product.image || '';
        form.querySelector('button[type="submit"]').textContent = 'Save product';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const deleteButton = event.target.closest('[data-delete-product]');
      if (deleteButton) {
        const productId = deleteButton.getAttribute('data-delete-product');
        try {
          await deleteProduct(productId);
          renderAdminInventory();
          renderShopPage();
          showToast('Product deleted');
        } catch (error) {
          showToast(error.message || 'Unable to delete product');
        }
      }
    });
  }

  function setupCartInteractions() {
    document.addEventListener('click', (event) => {
      const addTrigger = event.target.closest('[data-add-to-cart]');
      if (addTrigger) {
        const productId = addTrigger.getAttribute('data-add-to-cart');
        const product = getProductById(productId);
        addToCart(product);
      }

      const changeTrigger = event.target.closest('[data-cart-change]');
      if (changeTrigger) {
        const productId = changeTrigger.getAttribute('data-cart-change');
        const qtyDelta = Number(changeTrigger.getAttribute('data-qty') || 0);
        const item = getCart().find((entry) => String(entry.id) === String(productId));
        if (!item) return;
        const nextQty = (Number(item.qty || 1) + qtyDelta);
        updateCartItem(productId, nextQty);
        renderCartPage();
      }

      const removeTrigger = event.target.closest('[data-cart-remove]');
      if (removeTrigger) {
        const productId = removeTrigger.getAttribute('data-cart-remove');
        removeCartItem(productId);
        renderCartPage();
      }
    });
  }

  function setupForms() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', submitInquiry);
    }

    const consultationForm = document.getElementById('consultationForm');
    if (consultationForm) {
      consultationForm.addEventListener('submit', submitConsultation);
    }

    document.querySelectorAll('[data-open-calendly]').forEach((button) => {
      button.addEventListener('click', () => {
        window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
      });
    });
  }

  async function initApp() {
    updateCartBadge();
    await syncProductsFromServer();
    renderShopPage();
    renderProductDetailPage();
    renderCartPage();
    renderAdminInventory();
    setupAdminForm();
    setupAdminActions();
    setupCartInteractions();
    setupForms();
  }

  document.addEventListener('DOMContentLoaded', initApp);
  window.addToCart = addToCart;
  window.formatPrice = formatPrice;
  window.triggerBlowKissAnimation = triggerBlowKissAnimation;
  window.openCalendly = () => window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
})();
