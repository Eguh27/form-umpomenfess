import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as startOAuth } from '../../pages/auth/login';
import { GET as finishOAuth } from '../../pages/auth/callback';
import { createBufferedClient } from './supabase';
import type { APIContext } from 'astro';

vi.mock('./supabase', () => ({
  getEnvConfig: vi.fn(() => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  })),
  createBufferedClient: vi.fn(() => ({
    supabase: {
      auth: {
        signInWithOAuth: vi.fn(async () => ({
          data: { url: 'https://accounts.google.com/o/oauth2/auth' },
          error: null,
        })),
        exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      },
    },
    flush: (response: Response) => response,
  })),
}));

vi.mock('./origin', () => ({
  publicOriginOf: vi.fn(() => 'https://form.example'),
}));

const createBufferedClientMock = vi.mocked(createBufferedClient);

function context(request: Request): APIContext {
  return {
    request,
    url: new URL(request.url),
    redirect: (url: string) =>
      new Response(null, { status: 302, headers: { Location: url } }),
  } as unknown as APIContext;
}

beforeEach(() => {
  createBufferedClientMock.mockClear();
});

describe('OAuth Google — preferensi "ingat saya" (T-80)', () => {
  it('mulai OAuth dengan remember menulis penanda pending 10 menit', async () => {
    const request = new Request('https://form.example/auth/login?remember=1');
    const response = await startOAuth(context(request));

    expect(response.status).toBe(303);
    expect(createBufferedClientMock).toHaveBeenCalledWith(
      request,
      expect.anything(),
      { remember: false },
    );
    const marker = response.headers.get('set-cookie') ?? '';
    expect(marker).toContain('umpf_ingat=pending');
    expect(marker).toContain('Max-Age=600');
    expect(marker).toContain('Secure');
  });

  it('callback dengan penanda pending membuat sesi persisten 30 hari', async () => {
    const request = new Request('https://form.example/auth/callback?code=abc', {
      headers: { cookie: 'umpf_ingat=pending' },
    });
    const response = await finishOAuth(context(request));

    expect(createBufferedClientMock).toHaveBeenCalledWith(
      request,
      expect.anything(),
      { remember: true, secure: true },
    );
    const marker = response.headers.get('set-cookie') ?? '';
    expect(marker).toContain('umpf_ingat=1');
    expect(marker).toContain('Max-Age=2592000');
  });

  it('callback tanpa penanda pending tetap memakai cookie sesi', async () => {
    const request = new Request('https://form.example/auth/callback?code=abc');
    const response = await finishOAuth(context(request));

    expect(createBufferedClientMock).toHaveBeenCalledWith(
      request,
      expect.anything(),
      { remember: false, secure: true },
    );
    const marker = response.headers.get('set-cookie') ?? '';
    expect(marker).toContain('umpf_ingat=0');
    expect(marker).not.toContain('Max-Age');
  });

  it('callback gagal menghapus penanda pending', async () => {
    const request = new Request('https://form.example/auth/callback', {
      headers: { cookie: 'umpf_ingat=pending' },
    });
    const response = await finishOAuth(context(request));

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('error=no_code');
    const marker = response.headers.get('set-cookie') ?? '';
    expect(marker).toContain('umpf_ingat=');
    expect(marker).toContain('Max-Age=0');
  });
});
