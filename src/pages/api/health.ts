/**
 * GET /api/health — Endpoint healthcheck & uptime ping (E-A3 / NF2).
 *
 * Mengembalikan status 200 OK beserta timestamp dan ketersediaan env server
 * (hanya boolean, tanpa secret) untuk memfasilitasi monitoring eksternal
 * (UptimeRobot, BetterStack, GitHub Actions ping) tanpa membebani database.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const hasSupabase = Boolean(
    import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
  const hasTurnstile = Boolean(import.meta.env.TURNSTILE_SITE_KEY);
  const hasCloudinary = Boolean(import.meta.env.CLOUDINARY_CLOUD_NAME);

  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      supabaseConfigured: hasSupabase,
      turnstileConfigured: hasTurnstile,
      cloudinaryConfigured: hasCloudinary,
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
