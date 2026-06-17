const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const consultationModal = document.getElementById('consultationModal');
const closeConsultationModal = document.getElementById('closeConsultationModal');

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.textContent = isOpen ? '✕' : '☰';
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '☰';
    });
  });
}

function openConsultationModal() {
  if (consultationModal) consultationModal.classList.remove('hidden');
}

function closeConsultationModalFn() {
  if (consultationModal) consultationModal.classList.add('hidden');
}

if (consultationModal) {
  document.querySelectorAll('.open-consultation-modal').forEach((button) => {
    button.addEventListener('click', openConsultationModal);
  });

  consultationModal.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal="true"]')) {
      closeConsultationModalFn();
    }
  });

  if (closeConsultationModal) closeConsultationModal.addEventListener('click', closeConsultationModalFn);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeConsultationModalFn();
  });
}

function sendEmail(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = (data.get('name') || 'Client').toString().trim();
  const email = (data.get('email') || '').toString().trim();
  const message = (data.get('message') || '').toString().trim();
  const subject = encodeURIComponent(`New consultation request from ${name}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
  window.location.href = `mailto:flourishpoppies@gmail.com?subject=${subject}&body=${body}`;
  form.reset();
}

window.sendEmail = sendEmail;
