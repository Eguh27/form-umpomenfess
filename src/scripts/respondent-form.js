/* global document, crypto */
// Dua perilaku kecil halaman isi form:
// 1. Token dedup untuk double-click/refresh (server tetap penegak utama).
// 2. Tombol Kirim nonaktif setelah submit pertama (cegah klik ganda).
// File eksternal supaya lolos CSP script-src 'self'.
(() => {
  const tokenInput = document.getElementById('client-token');
  if (tokenInput !== null && crypto.randomUUID) {
    tokenInput.value = crypto.randomUUID().replace(/-/g, '');
  }

  const form = document.querySelector('form[action$="/submit"]');
  if (form === null) return;
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    if (button !== null) button.disabled = true;
  });
})();
