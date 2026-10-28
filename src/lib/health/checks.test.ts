import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { probeSupabase, probeCloudinary } from './checks';

describe('probeSupabase', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchSpy); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns ok when REST endpoint responds < 500', async () => {
    fetchSpy.mockResolvedValue({ status: 200 });
    const r = await probeSupabase('https://x.supabase.co', 'key');
    expect(r.ok).toBe(true);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.error).toBeUndefined();
  });

  it('returns not ok on 500+', async () => {
    fetchSpy.mockResolvedValue({ status: 503 });
    const r = await probeSupabase('https://x.supabase.co', 'key');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('HTTP 503');
  });

  it('returns not ok on network error', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await probeSupabase('https://x.supabase.co', 'key');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ECONNREFUSED');
  });

  it('sends correct auth headers', async () => {
    fetchSpy.mockResolvedValue({ status: 200 });
    await probeSupabase('https://x.supabase.co', 'my-key');
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://x.supabase.co/rest/v1/');
    expect(opts.headers.apikey).toBe('my-key');
    expect(opts.headers.Authorization).toBe('Bearer my-key');
  });
});

describe('probeCloudinary', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal('fetch', fetchSpy); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns ok when API is reachable (401 expected)', async () => {
    fetchSpy.mockResolvedValue({ status: 401 });
    const r = await probeCloudinary('my-cloud');
    expect(r.ok).toBe(true);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns not ok on 500 (API down)', async () => {
    fetchSpy.mockResolvedValue({ status: 500 });
    const r = await probeCloudinary('my-cloud');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('HTTP 500');
  });

  it('returns not ok on network failure', async () => {
    fetchSpy.mockRejectedValue(new Error('timeout'));
    const r = await probeCloudinary('my-cloud');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('timeout');
  });

  it('calls correct Cloudinary URL', async () => {
    fetchSpy.mockResolvedValue({ status: 401 });
    await probeCloudinary('acme');
    expect(fetchSpy.mock.calls[0][0]).toBe(
      'https://api.cloudinary.com/v1_1/acme/usage',
    );
  });
});
