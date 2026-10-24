/* global document, Element, Node */
const details = document.querySelector('[data-nav-menu]');

if (details) {
  const summary = details.querySelector('summary');
  const syncLabel = () => {
    summary?.setAttribute('aria-label', details.open ? 'Tutup menu' : 'Buka menu');
  };

  details.addEventListener('toggle', syncLabel);
  syncLabel();

  details.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a')) details.open = false;
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!details.open || !(target instanceof Node)) return;
    if (!details.contains(target)) details.open = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;
    details.open = false;
    summary?.focus();
  });
}
