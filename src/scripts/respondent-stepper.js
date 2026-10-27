/* global document, window */
// T-77: stepper multi-halaman. Form multi-halaman dirender dengan novalidate;
// validasi tiap halaman manual lewat Constraint Validation API sehingga
// required di halaman TERSEMBUNYI tidak menghambat. Server tetap memvalidasi
// jawaban penuh di endpoint submit.
(() => {
  const form = document.querySelector('form[action$="/submit"]');
  // noValidate = properti IDL camelCase (bukan nama atribut) untuk form multi-halaman.
  if (form === null || !form.noValidate) return;

  const pageEls = Array.prototype.slice.call(form.querySelectorAll('[data-page]'));
  if (pageEls.length < 2) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function activeIndex() {
    for (let i = 0; i < pageEls.length; i++) {
      if (!pageEls[i].hasAttribute('hidden')) return i;
    }
    return 0;
  }

  function firstInvalid(pageEl) {
    const controls = pageEl.querySelectorAll('input:not([type="hidden"]), select, textarea');
    for (let i = 0; i < controls.length; i++) {
      if (!controls[i].checkValidity()) return controls[i];
    }
    return null;
  }

  function show(index) {
    for (let i = 0; i < pageEls.length; i++) {
      if (i === index) pageEls[i].removeAttribute('hidden');
      else pageEls[i].setAttribute('hidden', '');
    }
    const target = pageEls[index];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('click', (event) => {
    const target = event.target;
    const button =
      target && target.closest
        ? target.closest('[data-page-next],[data-page-prev],button[type="submit"]')
        : null;
    if (button === null) return;

    const index = activeIndex();

    if (button.hasAttribute('data-page-prev')) {
      if (index > 0) show(index - 1);
      return;
    }

    if (button.hasAttribute('data-page-next')) {
      const invalid = firstInvalid(pageEls[index]);
      if (invalid !== null) {
        invalid.reportValidity();
        return;
      }
      show(index + 1);
      return;
    }

    if (index < pageEls.length - 1) {
      // Kirim diklik di halaman tengah = efek Enter implisit: perlakukan seperti Lanjut.
      event.preventDefault();
      const invalid = firstInvalid(pageEls[index]);
      if (invalid !== null) {
        invalid.reportValidity();
        return;
      }
      show(index + 1);
      return;
    }

    const invalid = firstInvalid(pageEls[index]);
    if (invalid !== null) {
      event.preventDefault();
      invalid.reportValidity();
    }
  });
})();
