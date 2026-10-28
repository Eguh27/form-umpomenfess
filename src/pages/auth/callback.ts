/**
 * /auth/callback (GET) — tujuan redirect setelah Google (T-13, Agent A).
 * Tukar `code` PKCE menjadi session; cookie hasil exchange dibawa Response.
 * Sejak T-80 preferensi "ingat saya" dibawa lewat cookie sementara `pending`
 * dari /auth/login: bila ada, sesi ditulis persisten 30 hari.
 * Bila gagal/tidak ada code → balik ke /login dengan flag error singkat
 * (pesan ditata di halaman login, tidak melempar detail teknis ke publik).
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';
import {
  isSecureRequest,
  REMEMBER_PENDING,
  readRememberValue,
  withClearedRememberCookie,
  withRememberCookie,
} from '../../lib/auth/session';

export const GET: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/login?error=setup');
  }

  const secure = isSecureRequest(context);
  const pending =
    readRememberValue(context.request.headers.get('Cookie')) === REMEMBER_PENDING;

  const code = context.url.searchParams.get('code');
  if (!code) {
    const response = context.redirect('/login?error=no_code');
    return pending ? withClearedRememberCookie(response, secure) : response;
  }

  const { supabase, flush } = createBufferedClient(context.request, config, {
    remember: pending,
    secure,
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const response = context.redirect('/login?error=auth');
    return pending ? withClearedRememberCookie(response, secure) : response;
  }

  return withRememberCookie(
    flush(new Response(null, { status: 303, headers: { Location: '/dashboard' } })),
    pending ? '1' : '0',
    secure,
  );
};
