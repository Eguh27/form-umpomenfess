/**
 * /auth/logout (GET) — bersihkan sesi cookie lalu ke halaman utama (T-13, Agent A).
 * T-80: cookie penanda "ingat saya" ikut dihapus agar login berikutnya kembali
 * menjadi cookie sesi (default aman).
 * Catatan MVP: GET logout sederhana; kalau T-65/R menilai perlu, ubah jadi POST
 * form + cek origin sebelum signOut (proteksi CSRF logout).
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';
import {
  isSecureRequest,
  withClearedRememberCookie,
} from '../../lib/auth/session';

export const GET: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/');
  }

  const secure = isSecureRequest(context);
  const { supabase, flush } = createBufferedClient(context.request, config, {
    remember: false,
    secure,
  });
  await supabase.auth.signOut();

  const response = flush(
    new Response(null, { status: 303, headers: { Location: '/' } }),
  );
  return withClearedRememberCookie(response, secure);
};
