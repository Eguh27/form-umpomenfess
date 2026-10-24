/* global localStorage, matchMedia, document */
// Inisialisasi tema sebelum render (hindari flash terang/gelap).
// Dimuat sebagai script klasik blocking dari <head>; dipisah dari Base.astro
// supaya CSP tidak memerlukan hash inline.
(() => {
  let stored = null;
  try {
    stored = localStorage.getItem('theme');
  } catch {
    // localStorage bisa diblokir; fallback ke preferensi sistem.
  }
  const theme = stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;

  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta !== null) {
    meta.setAttribute('content', theme === 'dark' ? '#131C1A' : '#FDEEEC');
  }
})();
