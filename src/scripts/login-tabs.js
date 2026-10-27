/* global document, window */
// Interaktivitas halaman login: tab Masuk/Daftar/Lupa, toggle password, dan
// tombol sosial yang belum aktif. File eksternal supaya lolos CSP
// `script-src 'self'` tanpa hash inline (script is:inline tidak di-hash Astro).
(() => {
  const tabLogin = document.getElementById('tab-btn-login');
  const tabSignup = document.getElementById('tab-btn-signup');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const formForgot = document.getElementById('form-forgot');
  const titleEl = document.getElementById('auth-title');
  const subtitleEl = document.getElementById('auth-subtitle');
  const switchPrompt = document.getElementById('switch-prompt');
  const switchLink = document.getElementById('btn-toggle-switch');
  const btnShowForgot = document.getElementById('btn-show-forgot');
  const btnBackLogin = document.getElementById('btn-back-login');

  function setTab(mode) {
    if (mode === 'signup') {
      tabLogin?.classList.remove('is-active');
      tabSignup?.classList.add('is-active');
      formLogin?.classList.add('is-hidden');
      formLogin?.classList.remove('is-visible');
      formSignup?.classList.remove('is-hidden');
      formSignup?.classList.add('is-visible');
      formForgot?.classList.add('is-hidden');
      formForgot?.classList.remove('is-visible');
      if (titleEl) titleEl.textContent = 'Daftar akun baru';
      if (subtitleEl) {
        subtitleEl.textContent =
          'Buat akun dalam hitungan detik untuk mulai menyusun form skripsi & survei.';
      }
      if (switchPrompt) switchPrompt.textContent = 'Sudah punya akun?';
      if (switchLink) switchLink.textContent = 'Masuk di sini';
      return;
    }

    if (mode === 'forgot') {
      tabLogin?.classList.remove('is-active');
      tabSignup?.classList.remove('is-active');
      formLogin?.classList.add('is-hidden');
      formLogin?.classList.remove('is-visible');
      formSignup?.classList.add('is-hidden');
      formSignup?.classList.remove('is-visible');
      formForgot?.classList.remove('is-hidden');
      formForgot?.classList.add('is-visible');
      if (titleEl) titleEl.textContent = 'Lupa kata sandi';
      if (subtitleEl) subtitleEl.textContent = 'Atur ulang kata sandi akun Anda melalui email.';
      return;
    }

    tabLogin?.classList.add('is-active');
    tabSignup?.classList.remove('is-active');
    formLogin?.classList.remove('is-hidden');
    formLogin?.classList.add('is-visible');
    formSignup?.classList.add('is-hidden');
    formSignup?.classList.remove('is-visible');
    formForgot?.classList.add('is-hidden');
    formForgot?.classList.remove('is-visible');
    if (titleEl) titleEl.textContent = 'Masuk dengan email';
    if (subtitleEl) {
      subtitleEl.textContent =
        'Kelola form kuesioner dan kumpulkan respons mahasiswa dengan mudah & gratis.';
    }
    if (switchPrompt) switchPrompt.textContent = 'Belum punya akun?';
    if (switchLink) switchLink.textContent = 'Daftar sekarang';
  }

  tabLogin?.addEventListener('click', () => setTab('login'));
  tabSignup?.addEventListener('click', () => setTab('signup'));
  btnShowForgot?.addEventListener('click', () => setTab('forgot'));
  btnBackLogin?.addEventListener('click', () => setTab('login'));

  switchLink?.addEventListener('click', () => {
    const isSignupActive = tabSignup?.classList.contains('is-active');
    setTab(isSignupActive ? 'login' : 'signup');
  });

  document.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.style.opacity = show ? '1' : '0.7';
    });
  });

  // Pengganti onclick inline yang diblokir CSP script-src-attr.
  document.querySelectorAll('[data-coming-soon]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.alert(btn.getAttribute('data-coming-soon'));
    });
  });
})();
