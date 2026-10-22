import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const okBody = { success: true };
const failBody = { success: false, 'error-codes': ['invalid-input-response'] };

afterEach(() => vi.unstubAllGlobals());

describe('verifyTurnstile (T-51)', () => {
  it('token tidak ada → gagal tanpa fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await verifyTurnstile(null, '1.2.3.4', 'secret')).ok).toBe(false);
    expect((await verifyTurnstile('', '1.2.3.4', 'secret')).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('secret belum diisi → GAGAL (fail-closed, anti-celah)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await verifyTurnstile('tok', null, null)).reason).toBe('captcha_tidak_aktif');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Cloudflare sukses → ok; body dikirim secret+response+remoteip', async () => {
    let sentBody = '';
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      sentBody = init?.body instanceof URLSearchParams ? init.body.toString() : '';
      expect(url.startsWith('https://challenges.cloudflare.com/turnstile/')).toBe(true);
      return new Response(JSON.stringify(okBody), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await verifyTurnstile('tok', '8.8.8.8', 'secret');
    expect(res.ok).toBe(true);
    expect(sentBody).toContain('secret=secret');
    expect(sentBody).toContain('response=tok');
    expect(sentBody).toContain('remoteip=8.8.8.8');
  });

  it('Cloudflare menolak → gagal alasan captcha_ditolak', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(failBody), { status: 400 }));
    const res = await verifyTurnstile('tok', null, 'secret');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('captcha_ditolak');
  });

  it('jaringan error/http 500 → gagal, tidak melempar', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network');
    });
    expect((await verifyTurnstile('tok', null, 'secret')).ok).toBe(false);
    vi.stubGlobal('fetch', async () => new Response('boom', { status: 502 }));
    expect((await verifyTurnstile('tok', null, 'secret')).ok).toBe(false);
  });
});
