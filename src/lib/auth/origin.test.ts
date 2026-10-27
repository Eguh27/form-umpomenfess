import { describe, expect, it } from 'vitest';
import { resolvePublicOrigin, toOrigin } from './origin';

function ctx(origin: string, headers: Record<string, string> = {}) {
  return {
    request: { headers: new Headers(headers) },
    url: new URL(`${origin}/auth/login`),
  };
}

describe('toOrigin', () => {
  it('menormalkan URL apa pun menjadi origin murni', () => {
    expect(toOrigin('https://form.umpomenfess.my.id/auth/callback?next=/dashboard')).toBe(
      'https://form.umpomenfess.my.id',
    );
    expect(toOrigin('http://localhost:4321/')).toBe('http://localhost:4321');
  });

  it('menolak nilai kosong, protocol non-HTTP, dan teks sampah', () => {
    expect(toOrigin('')).toBeNull();
    expect(toOrigin('   ')).toBeNull();
    expect(toOrigin(undefined)).toBeNull();
    expect(toOrigin('ftp://form.umpomenfess.my.id')).toBeNull();
    expect(toOrigin('bukan-url')).toBeNull();
  });
});

describe('resolvePublicOrigin', () => {
  it('mode dev memakai origin request agar login lokal tetap di localhost', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:4321', {
        'x-forwarded-host': 'form.umpomenfess.my.id',
        'x-forwarded-proto': 'https',
      }),
      { dev: true, configuredSiteUrl: 'https://form.umpomenfess.my.id' },
    );
    expect(origin).toBe('http://localhost:4321');
  });

  it('produksi memakai x-forwarded-host (domain yang benar-benar dibuka pengguna)', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:3000', {
        'x-forwarded-host': 'form.umpomenfess.my.id',
        'x-forwarded-proto': 'https',
      }),
      { dev: false, configuredSiteUrl: 'https://form.umpomenfess.my.id' },
    );
    expect(origin).toBe('https://form.umpomenfess.my.id');
  });

  it('produksi mendukung preview deployment lewat forwarded host', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:3000', {
        'x-forwarded-host': 'form-umpomenfess-git-main-eguh.vercel.app',
        'x-forwarded-proto': 'https',
      }),
      { dev: false },
    );
    expect(origin).toBe('https://form-umpomenfess-git-main-eguh.vercel.app');
  });

  it('mengambil host pertama bila header berisi daftar dipisah koma', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:3000', {
        'x-forwarded-host': 'form.umpomenfess.my.id, proxy.internal',
        'x-forwarded-proto': 'https, http',
      }),
      { dev: false },
    );
    expect(origin).toBe('https://form.umpomenfess.my.id');
  });

  it('jatuh ke PUBLIC_SITE_URL bila forwarded host tidak ada', () => {
    const origin = resolvePublicOrigin(ctx('http://localhost:3000'), {
      dev: false,
      configuredSiteUrl: 'https://form.umpomenfess.my.id',
    });
    expect(origin).toBe('https://form.umpomenfess.my.id');
  });

  it('mengabaikan forwarded host rusak lalu memakai PUBLIC_SITE_URL', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:3000', { 'x-forwarded-host': '///' }),
      { dev: false, configuredSiteUrl: 'https://form.umpomenfess.my.id' },
    );
    expect(origin).toBe('https://form.umpomenfess.my.id');
  });

  it('fallback terakhir adalah origin request', () => {
    const origin = resolvePublicOrigin(ctx('https://internal.example'), { dev: false });
    expect(origin).toBe('https://internal.example');
  });

  it('memakai https default bila x-forwarded-proto tidak dikirim', () => {
    const origin = resolvePublicOrigin(
      ctx('http://localhost:3000', { 'x-forwarded-host': 'form.umpomenfess.my.id' }),
      { dev: false },
    );
    expect(origin).toBe('https://form.umpomenfess.my.id');
  });
});
