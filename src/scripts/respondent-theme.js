/* global document, localStorage */
// Tombol tema halaman responden. Eksternal agar lolos CSP script-src 'self'.
(() => {
  const btn = document.getElementById('respondent-theme-toggle');
  if (!btn) return;

  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  const sync = () => {
    const isDark = current() === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', isDark ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
    btn.title = isDark ? 'Tema terang' : 'Tema gelap';
  };

  btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('respondent_theme', next);
    } catch {
      // Penyimpanan tema opsional; abaikan bila diblokir.
    }
    sync();
  });

  sync();
})();
