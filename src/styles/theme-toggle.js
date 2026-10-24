/* global window, document, localStorage */
// Tombol tema di header. Script eksternal supaya lolos CSP script-src 'self'
// tanpa hash inline. Preferensi disimpan di localStorage 'theme'.
(() => {
  const button = document.querySelector('[data-theme-toggle]');
  if (button === null) return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');

  const readStored = () => {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  };

  const current = () =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

  const sync = () => {
    const dark = current() === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
    button.title = dark ? 'Tema terang' : 'Tema gelap';
    if (meta !== null) {
      meta.setAttribute('content', dark ? '#131C1A' : '#FDEEEC');
    }
  };

  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Preferensi tetap berlaku untuk sesi ini walau storage diblokir.
    }
    sync();
  });

  const onSchemeChange = (event) => {
    // Pilihan manual pengguna tidak boleh ditimpa preferensi sistem.
    if (readStored() !== null) return;
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
    sync();
  };

  media.addEventListener('change', onSchemeChange);

  sync();
})();
