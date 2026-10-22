/* global localStorage, matchMedia, document */
// Inisialisasi tema sebelum render (hindari flash terang/gelap).
// Dimuat sebagai script klasik blocking dari <head>; dipisah dari Base.astro
// supaya CSP tidak memerlukan hash inline.
(() => {
  const stored = localStorage.getItem('theme');
  const theme = stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
})();
