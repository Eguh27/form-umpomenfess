/**
 * /auth/email (POST) — handler login & registrasi email/password (T-15, Agent A).
 *
 * Menggunakan createBufferedClient agar cookie sesi tersimpan di browser
 * saat login/signup berhasil, lalu di-flush ke Response 303 -> /dashboard.
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';
import { publicOriginOf } from '../../lib/auth/origin';

export const POST: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/login?error=setup');
  }

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return context.redirect('/login?error=invalid_payload');
  }

  const action = String(formData.get('action') ?? 'login');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '').trim();

  const { supabase, flush } = createBufferedClient(context.request, config);

  // 1. Registrasi Akun Baru (Sign Up)
  if (action === 'signup') {
    if (!email || !password) {
      return context.redirect('/login?tab=signup&error=data_kurang');
    }
    if (password.length < 6) {
      return context.redirect('/login?tab=signup&error=password_pendek');
    }

    const origin = publicOriginOf(context);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      const msg = encodeURIComponent(error.message);
      return context.redirect(`/login?tab=signup&error=${msg}`);
    }

    // Jika akun langsung aktif (tanpa email verification di dev)
    if (data.session) {
      return flush(new Response(null, { status: 303, headers: { Location: '/dashboard' } }));
    }

    // Jika membutuhkan konfirmasi email
    return flush(new Response(null, { status: 303, headers: { Location: '/login?tab=login&msg=konfirmasi_email' } }));
  }

  // 2. Lupa Kata Sandi (Forgot Password)
  if (action === 'forgot') {
    if (!email) {
      return context.redirect('/login?tab=forgot&error=email_wajib');
    }
    const origin = publicOriginOf(context);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    });

    if (error) {
      const msg = encodeURIComponent(error.message);
      return context.redirect(`/login?tab=forgot&error=${msg}`);
    }

    return context.redirect('/login?tab=login&msg=reset_terkirim');
  }

  // 3. Masuk dengan Email & Password (Login)
  if (!email || !password) {
    return context.redirect('/login?tab=login&error=kredensial_kosong');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const errCode = error.message.includes('Invalid login credentials')
      ? 'kredensial_salah'
      : error.message.includes('Email not confirmed')
        ? 'email_belum_konfirmasi'
        : encodeURIComponent(error.message);
    return context.redirect(`/login?tab=login&error=${errCode}`);
  }

  return flush(new Response(null, { status: 303, headers: { Location: '/dashboard' } }));
};

