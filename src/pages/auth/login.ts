/**
 * /auth/login (GET) — titik mulai login Google (T-13, Agent A).
 *
 * Server memanggil signInWithOAuth lalu mengalihkan ke URL Google.
 * flowType PKCE dipaksa oleh @supabase/ssr; code verifier disimpan sebagai
 * cookie oleh client, jadi Response di sini wajib membawa cookie buffered itu.
 */
import type { APIRoute } from 'astro';
import { createBufferedClient, getEnvConfig } from '../../lib/auth/supabase';

export const GET: APIRoute = async (context) => {
  const config = getEnvConfig();
  if (!config) {
    return context.redirect('/login?error=setup');
  }

  const { supabase, flush } = createBufferedClient(context.request, config);
  const origin = context.url.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Absolute URL — origin permintaan mengikuti localhost/production otomatis
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return context.redirect('/login?error=setup');
  }

  return flush(new Response(null, { status: 303, headers: { Location: data.url } }));
};
