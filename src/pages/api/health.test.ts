import type { APIContext } from 'astro';
import { describe, expect, it } from 'vitest';
import { GET } from './health';

describe('GET /api/health', () => {
  it('returns 200 with status ok and valid json payload', async () => {
    const mockContext = {
      request: new Request('https://form.umpomenfess.my.id/api/health'),
    } as unknown as APIContext;

    const res = await GET(mockContext);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Cache-Control')).toContain('no-store');

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('string');
    expect(data.version).toBe('0.1.0');
    expect(typeof data.services.supabaseConfigured).toBe('boolean');
  });
});
