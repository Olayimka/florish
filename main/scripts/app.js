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

  function formatPrice(value) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value || 0);
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
    const response = await fetch(PRODUCT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to save product');
    writeProductsToStorage(data.products || [data.product]);
    return data.product;
  }

  async function updateProduct(productPayload) {
    const response = await fetch('/api/products/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productPayload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update product');
    writeProductsToStorage(data.products || []);
    return data.products;
  }

  async function deleteProduct(productId) {
    const response = await fetch('/api/products/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to delete product');
    writeProductsToStorage(data.products || []);
    return data.products;
  }

  async function submitInquiry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not send message');
    window.location.href = data.mailtoLink;
    form.reset();
    showToast('Thanks! Your message is ready to send.');
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
    const inventoryBody = document.getElementById('inventoryTableBody');
    if (!container && !inventoryBody) return;

    const products = getProducts();
    if (container) {
      container.innerHTML = products.map((product) => `
        <article class="product-card rounded-3xl bg-white p-4 shadow-xl hover:-translate-y-1 transition">
          <a href="product-detail.html?id=${product.id}" class="block">
            <img src="${product.image}" alt="${product.name}" class="h-56 w-full rounded-2xl object-cover">
          </a>
          <span class="category mt-4 block text-xs uppercase tracking-[0.25em] text-gray-500">${product.category || 'Beauty'}</span>
          <h3 class="mt-2 text-xl font-semibold text-blue-950">${product.name}</h3>
          <p class="mt-2 text-sm text-gray-600">${product.description}</p>
          <p class="price mt-3 text-blue-800 font-semibold">${formatPrice(product.price)}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <a href="product-detail.html?id=${product.id}" class="inline-flex rounded-full bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">View details</a>
            <button type="button" class="inline-flex rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50" data-add-to-cart="${product.id}">Add to cart</button>
          </div>
        </article>
      `).join('');
    }

    if (inventoryBody) {
      inventoryBody.innerHTML = products.map((product) => `
        <tr class="border-b border-amber-100 text-sm text-gray-700">
          <td class="py-3 pr-3 font-semibold text-blue-950">${product.name}</td>
          <td class="py-3 pr-3">${product.category || 'Beauty'}</td>
          <td class="py-3 pr-3">${formatPrice(product.price)}</td>
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
          <div class="mt-6 flex flex-wrap gap-3">
            <button type="button" id="detailAddToCart" class="rounded-2xl bg-blue-800 px-5 py-3 text-white font-semibold hover:bg-blue-900" data-add-to-cart="${product.id}">Add to cart</button>
            <a href="cart.html" class="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-900 font-semibold hover:bg-blue-100">View cart</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderCartPage() {
    const container = document.getElementById('cartItems');
    const subtotal = document.getElementById('cartSubtotal');
    const count = document.getElementById('cartCount');
    if (!container) return;

    const cart = getCart();
    if (!cart.length) {
      container.innerHTML = '<p class="text-gray-600">Your cart is empty. Start with one of our beauty essentials.</p>';
      if (subtotal) subtotal.textContent = formatPrice(0);
      if (count) count.textContent = '0 items';
      return;
    }

    const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
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
        <div class="flex items-center gap-3">
          <button type="button" class="rounded-full border border-blue-200 px-3 py-1 text-sm" data-cart-change="${item.id}" data-qty="-1">−</button>
          <span class="text-sm font-semibold text-blue-950">Qty ${item.qty}</span>
          <button type="button" class="rounded-full border border-blue-200 px-3 py-1 text-sm" data-cart-change="${item.id}" data-qty="1">+</button>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-lg font-semibold text-blue-900">${formatPrice(Number(item.price || 0) * Number(item.qty || 1))}</div>
          <button type="button" class="rounded-full bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700" data-cart-remove="${item.id}">Remove</button>
        </div>
      </article>
    `).join('');

    if (subtotal) subtotal.textContent = formatPrice(total);
    if (count) count.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''}`;
  }

  function renderAdminInventory() {
    const tableBody = document.getElementById('adminInventoryTable');
    if (!tableBody) return;
    const products = getProducts();
    tableBody.innerHTML = products.map((product) => `
      <tr class="border-b border-amber-100 text-sm text-gray-700">
        <td class="py-3 pr-3 font-semibold text-blue-950">${product.name}</td>
        <td class="py-3 pr-3">${product.category || 'Beauty'}</td>
        <td class="py-3 pr-3">${formatPrice(product.price)}</td>
        <td class="py-3 pr-3"><span class="rounded-full px-3 py-1 text-xs font-semibold ${product.sold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}">${product.sold ? 'Sold' : 'Available'}</span></td>
        <td class="py-3 pr-3">
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-900" data-edit-product="${product.id}">Edit</button>
            <button type="button" class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700" data-delete-product="${product.id}">Delete</button>
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
  window.openCalendly = () => window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
})();
