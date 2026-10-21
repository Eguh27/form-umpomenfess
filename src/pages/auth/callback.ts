/**
 * /auth/callback (GET) — tujuan redirect setelah Google (T-13, Agent A).
 * Tukar `code` PKCE menjadi session; cookie hasil exchange dibawa Response.
 * Bila gagal/tidak ada code → balik ke /login dengan flag error singkat
 * (pesan ditata di halaman login, tidak melempar detail teknis ke publik).
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';

export const GET: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/login?error=setup');
  }

  const code = context.url.searchParams.get('code');
  if (!code) {
    return context.redirect('/login?error=no_code');
  }

  const { supabase, flush } = createBufferedClient(context.request, config);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return context.redirect('/login?error=auth');
  }

  return flush(new Response(null, { status: 303, headers: { Location: '/dashboard' } }));
};
