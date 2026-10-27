/* global document */
// Dialog "Laporkan form ini": buka/tutup, klik backdrop, dan chip kategori.
// Eksternal supaya lolos CSP script-src 'self'.
(() => {
  const btnOpen = document.getElementById('btn-open-report');
  const dialog = document.getElementById('report-dialog');
  const btnClose = document.getElementById('btn-close-report');
  const btnCancel = document.getElementById('btn-cancel-report');
  const reasonInput = document.getElementById('report-reason-input');

  if (btnOpen && dialog) {
    btnOpen.addEventListener('click', () => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  btnClose?.addEventListener('click', closeDialog);
  btnCancel?.addEventListener('click', closeDialog);

  if (dialog) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog();
    });
  }

  document.querySelectorAll('.report-preset-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-reason');
      if (reasonInput && text) {
        reasonInput.value = text;
        reasonInput.focus();
      }
    });
  });
})();
