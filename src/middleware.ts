/**
 * src/middleware.ts — proteksi sesi (T-13, Agent A).
 *
 * - Membuat client Supabase ber-SSR-cookie per request (lihat src/lib/auth/supabase.ts).
 * - Memvalidasi sesi tiap request (getUser → verifikasi JWT server-side),
 *   hasilnya ditaruh di locals.supabase / locals.user untuk semua halaman.
 * - /dashboard WAJIB login (TASK 6 poin 1); anonim dialihkan ke /login.
 *   Kepemilikan data TETAP dikecek di server via RLS — middleware hanya pintu.
 */
import { defineMiddleware } from 'astro:middleware';
import { createAstroCookiesClient, getEnvConfig } from './lib/auth/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const config = getEnvConfig();
  if (!config) {
    // Env belum diisi: app tetap hidup (halaman publik), auth dinonaktifkan.
    context.locals.supabase = null;
    context.locals.user = null;
  } else {
    const supabase = createAstroCookiesClient(context, config);
    context.locals.supabase = supabase;
    const { data } = await supabase.auth.getUser();
    context.locals.user = data.user ?? null;
  }

  if (context.url.pathname.startsWith('/dashboard') && !context.locals.user) {
    return context.redirect('/login');
  }

  return next();
});
