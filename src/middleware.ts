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
import {
  hasRememberCookie,
  isRemembered,
  isSecureRequest,
  REMEMBER_COOKIE,
  rememberCookieOptions,
} from './lib/auth/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const config = getEnvConfig();
  const cookieHeader = context.request.headers.get('Cookie');
  const remember = isRemembered(cookieHeader);
  if (!config) {
    // Env belum diisi: app tetap hidup (halaman publik), auth dinonaktifkan.
    context.locals.supabase = null;
    context.locals.user = null;
  } else {
    const supabase = createAstroCookiesClient(context, config, { remember });
    context.locals.supabase = supabase;
    const { data } = await supabase.auth.getUser();
    context.locals.user = data.user ?? null;

    // Sesi lama (sebelum T-80) belum punya penanda. Pasang "0" agar browser
    // client ikut menulis cookie sesi, bukan persisten 400 hari.
    if (context.locals.user !== null && !hasRememberCookie(cookieHeader)) {
      context.cookies.set(
        REMEMBER_COOKIE,
        '0',
        rememberCookieOptions('0', isSecureRequest(context)),
      );
    }
  }

  if (context.url.pathname.startsWith('/dashboard') && !context.locals.user) {
    return context.redirect('/login');
  }

  const response = await next();

  // E-A4: Security Headers (defense-in-depth bersama Astro CSP)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'DENY');

  // HSTS untuk HTTPS atau environment produksi
  if (context.url.protocol === 'https:' || import.meta.env.PROD) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // S7: Cache-Control privat untuk seluruh rute terautentikasi dan API
  if (context.url.pathname.startsWith('/dashboard') || context.url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
  }

  // Anti-fingerprinting: sembunyikan jejak server & framework
  response.headers.delete('X-Powered-By');
  response.headers.delete('x-powered-by');
  response.headers.delete('Server');
  response.headers.delete('server');

  return response;
});

