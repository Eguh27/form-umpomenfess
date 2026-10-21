/**
 * /auth/logout (GET) — bersihkan sesi cookie lalu ke halaman utama (T-13, Agent A).
 * Catatan MVP: GET logout sederhana; kalau T-65/R menilai perlu, ubah jadi POST
 * form + cek origin sebelum signOut (proteksi CSRF logout).
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';

export const GET: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/');
  }

  const { supabase, flush } = createBufferedClient(context.request, config);
  await supabase.auth.signOut();

  return flush(new Response(null, { status: 303, headers: { Location: '/' } }));
};
