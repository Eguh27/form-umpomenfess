/* global localStorage, document */
// Inisialisasi tema halaman responden sebelum render (hindari flash).
// Kunci terpisah dari situs utama: pengunjung form tidak mewarisi tema dashboard.
(() => {
  let stored = null;
  try {
    stored = localStorage.getItem('respondent_theme');
  } catch {
    // localStorage bisa diblokir; pakai tema terang.
  }
  document.documentElement.dataset.theme = stored === 'dark' ? 'dark' : 'light';
})();
