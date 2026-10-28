/**
 * GET /api/health — Healthcheck & uptime ping (E-A3 / NF2, hardened).
 *
 * Returns 200 OK with env availability flags and **active connectivity
 * probes** for Supabase REST and Cloudinary API. Probes run in parallel
 * with a 4 s timeout each. If any probe fails the top-level status
 * becomes "degraded" (still 200 so uptime monitors don't flap on partial
 * outages — use `services.*.ok` for granular alerts).
 *
 * Query parameter `?deep=1` enables probes (default: passive only, to keep
 * the ping fast for simple uptime monitors).
 */
import type { APIRoute } from 'astro';
import { probeSupabase, probeCloudinary } from '../../lib/health/checks';

export const prerender = false;

interface ServiceStatus {
  configured: boolean;
  ok?: boolean;
  latencyMs?: number;
  error?: string;
}

export const GET: APIRoute = async ({ url }) => {
  const deep = url.searchParams.get('deep') === '1';

  const supabaseUrl = (import.meta.env.PUBLIC_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const supabaseKey = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
  const cloudName = (import.meta.env.CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ?? '';
  const hasTurnstile = Boolean(import.meta.env.TURNSTILE_SITE_KEY);

  const hasSupabase = Boolean(supabaseUrl && supabaseKey);
  const hasCloudinary = Boolean(cloudName);

  const supabase: ServiceStatus = { configured: hasSupabase };
  const cloudinary: ServiceStatus = { configured: hasCloudinary };

  if (deep) {
    const [sbResult, cdnResult] = await Promise.all([
      hasSupabase ? probeSupabase(supabaseUrl, supabaseKey) : null,
      hasCloudinary ? probeCloudinary(cloudName) : null,
    ]);

    if (sbResult) Object.assign(supabase, sbResult);
    if (cdnResult) Object.assign(cloudinary, cdnResult);
  }

  const allOk = !deep || (
    (supabase.ok ?? true) && (cloudinary.ok ?? true)
  );

  const payload = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    deep,
    services: {
      supabase,
      cloudinary,
      turnstileConfigured: hasTurnstile,
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
