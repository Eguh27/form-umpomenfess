/* global document, crypto, localStorage */
// Dua perilaku kecil halaman isi form:
// 1. Token dedup untuk double-click/refresh (server tetap penegak utama).
// 2. Tombol Kirim nonaktif setelah submit pertama (cegah klik ganda).
// 3. Simpan progres form ke localStorage agar tidak hilang saat reload.
// File eksternal supaya lolos CSP script-src 'self'.
(() => {
  const tokenInput = document.getElementById('client-token');
  if (tokenInput !== null && crypto.randomUUID) {
    tokenInput.value = crypto.randomUUID().replace(/-/g, '');
  }

  const form = document.querySelector('form[action$="/submit"]');
  if (form === null) return;

  const storageKey = `umpf_respondent:${window.location.pathname}`;

  const readState = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const serialize = () => {
    const values = {};
    const fields = Array.from(form.elements);
    for (const field of fields) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }
      const { name, type } = field;
      if (!name || field.disabled) continue;
      if (type === 'submit' || type === 'button' || type === 'hidden') continue;

      if (type === 'checkbox') {
        if (!values[name]) values[name] = [];
        if (field.checked) values[name].push(field.value);
        continue;
      }

      if (type === 'radio') {
        if (field.checked) values[name] = field.value;
        continue;
      }

      if (field.value !== '') values[name] = field.value;
    }
    return values;
  };

  const restore = () => {
    const state = readState();
    if (!state || typeof state !== 'object') return;

    const values = state.values ?? {};
    const fields = Array.from(form.elements);
    for (const field of fields) {
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
        continue;
      }
      const { name, type } = field;
      if (!name || field.disabled) continue;
      if (type === 'submit' || type === 'button' || type === 'hidden') continue;

      const value = values[name];
      if (value === undefined) continue;

      if (type === 'checkbox') {
        const accepted = Array.isArray(value) ? value : [value];
        field.checked = accepted.includes(field.value);
      } else if (type === 'radio') {
        field.checked = String(value) === String(field.value);
      } else {
        field.value = String(value);
      }
    }

    if (typeof state.page === 'number') {
      const pages = Array.from(form.querySelectorAll('[data-page]'));
      if (pages.length > 0 && state.page >= 0 && state.page < pages.length) {
        pages.forEach((page, index) => {
          if (index === state.page) page.removeAttribute('hidden');
          else page.setAttribute('hidden', 'hidden');
        });
      }
    }
  };

  const persist = () => {
    try {
      const pages = Array.from(form.querySelectorAll('[data-page]'));
      const page = pages.findIndex((item) => !item.hasAttribute('hidden'));
      const state = {
        page: page >= 0 ? page : 0,
        values: serialize(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // storage mungkin dibatasi; abaikan.
    }
  };

  restore();
  persist();
  form.addEventListener('input', persist);
  form.addEventListener('change', persist);
  form.addEventListener('submit', () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // abaikan bila storage tidak tersedia.
    }
    const button = form.querySelector('button[type="submit"]');
    if (button !== null) button.disabled = true;
  });
})();
