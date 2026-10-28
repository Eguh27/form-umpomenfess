import type { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';
import { GET } from './health';

function makeContext(path: string): APIContext {
  const reqUrl = new URL(path, 'https://form.umpomenfess.my.id');
  return {
    request: new Request(reqUrl),
    url: reqUrl,
  } as unknown as APIContext;
}

describe('GET /api/health', () => {
  it('returns 200 ok in passive mode (no deep)', async () => {
    const res = await GET(makeContext('/api/health'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toContain('no-store');

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.deep).toBe(false);
    expect(typeof data.timestamp).toBe('string');
    expect(data.version).toBe('0.1.0');
    expect(typeof data.services.supabase.configured).toBe('boolean');
    expect(typeof data.services.cloudinary.configured).toBe('boolean');
    expect(typeof data.services.turnstileConfigured).toBe('boolean');
  });

  it('passive mode does not include latency fields', async () => {
    const res = await GET(makeContext('/api/health'));
    const data = await res.json();
    expect(data.services.supabase.latencyMs).toBeUndefined();
    expect(data.services.cloudinary.latencyMs).toBeUndefined();
  });

  it('returns deep flag when ?deep=1', async () => {
    const res = await GET(makeContext('/api/health?deep=1'));
    const data = await res.json();
    expect(data.deep).toBe(true);
  });
});
