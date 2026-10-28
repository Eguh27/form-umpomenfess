/**
 * src/lib/health/checks.ts — Active connectivity probes for Supabase & Cloudinary.
 *
 * Each probe returns { ok, latencyMs, error? }. Designed for the /api/health
 * endpoint (E-A3 hardening). Probes are non-destructive read-only operations
 * with aggressive timeouts so they don't block the health response.
 */

const PROBE_TIMEOUT_MS = 4000;

export interface ProbeResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

/** Lightweight Supabase REST probe: HEAD request to the API root. */
export async function probeSupabase(
  url: string,
  anonKey: string,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const res = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    return {
      ok: res.status < 500,
      latencyMs: Date.now() - start,
      ...(res.status >= 500 && { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

/**
 * Cloudinary API ping: GET /v1_1/{cloud}/usage with invalid credentials.
 * We expect 401 (proves API is reachable). 5xx or timeout = unhealthy.
 */
export async function probeCloudinary(
  cloudName: string,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/usage`,
      { method: 'GET', signal: controller.signal },
    );
    clearTimeout(timer);

    const reachable = res.status < 500;
    return {
      ok: reachable,
      latencyMs: Date.now() - start,
      ...(!reachable && { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}
