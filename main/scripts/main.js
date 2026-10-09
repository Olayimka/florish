const CALENDLY_URL = 'https://calendly.com/blessedbestone/beauty-consultation';

function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (menuBtn && mobileMenu) {
    // Clone to remove any duplicate listeners
    const newBtn = menuBtn.cloneNode(true);
    if (menuBtn.parentNode) {
      menuBtn.parentNode.replaceChild(newBtn, menuBtn);
    }

    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = mobileMenu.classList.contains('hidden');
      if (isHidden) {
        mobileMenu.classList.remove('hidden');
        mobileMenu.classList.add('open');
        newBtn.setAttribute('aria-expanded', 'true');
        newBtn.textContent = '✕';
      } else {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('open');
        newBtn.setAttribute('aria-expanded', 'false');
        newBtn.textContent = '☰';
      }
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('open');
        newBtn.setAttribute('aria-expanded', 'false');
        newBtn.textContent = '☰';
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
  initMobileMenu();
}

function openConsultationModal() {
  const modal = document.getElementById('consultationModal');
  if (modal) modal.classList.remove('hidden');
}

function closeConsultationModalFn() {
  const modal = document.getElementById('consultationModal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('consultationModal');
  const closeBtn = document.getElementById('closeConsultationModal');

  if (modal) {
    document.querySelectorAll('.open-consultation-modal').forEach((button) => {
      button.addEventListener('click', openConsultationModal);
    });

    modal.addEventListener('click', (event) => {
      if (event.target.matches('[data-close-modal="true"]')) {
        closeConsultationModalFn();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeConsultationModalFn);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeConsultationModalFn();
    });
  }

  // Handle all Calendly buttons (including inside consultationModal)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-calendly]');
    if (btn) {
      closeConsultationModalFn();
      if (typeof window.Calendly === 'object' && typeof window.Calendly.initPopupWidget === 'function') {
        window.Calendly.initPopupWidget({ url: CALENDLY_URL });
      } else {
        window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer');
      }
    }
  });
});
