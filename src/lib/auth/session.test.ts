import { describe, expect, it } from 'vitest';
import {
  clearRememberCookieHeader,
  isRemembered,
  isSecureRequest,
  readRememberValue,
  rememberCookieHeader,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE,
  REMEMBER_PENDING,
  REMEMBER_PENDING_MAX_AGE,
  sessionCookieOptions,
} from './session';

describe('sessionCookieOptions — masa hidup cookie auth', () => {
  it('default: cookie sesi (tanpa maxAge/expires) agar hilang saat browser ditutup', () => {
    const options = sessionCookieOptions(
      { path: '/', sameSite: 'lax', httpOnly: false, maxAge: 400 * 24 * 60 * 60 },
      false,
      false,
    );
    expect(options.maxAge).toBeUndefined();
    expect(options.expires).toBeUndefined();
    expect(options.path).toBe('/');
    expect(options.httpOnly).toBe(false);
  });

  it('ingat saya: 30 hari dan expires lama dibuang', () => {
    const old = new Date('2030-01-01T00:00:00Z');
    const options = sessionCookieOptions({ path: '/', expires: old }, true, false);
    expect(options.maxAge).toBe(REMEMBER_MAX_AGE);
    expect(options.expires).toBeUndefined();
  });

  it('penghapusan cookie (maxAge 0) tidak diubah menjadi sesi/persisten', () => {
    const options = sessionCookieOptions(
      { path: '/', maxAge: 0 },
      false,
      false,
    );
    expect(options.maxAge).toBe(0);
  });

  it('HTTPS memaksa atribut Secure pada cookie auth', () => {
    const options = sessionCookieOptions({ path: '/' }, false, true);
    expect(options.secure).toBe(true);
  });
});

describe('cookie penanda "ingat saya"', () => {
  it('membaca nilai 0/1/pending dari header Cookie', () => {
    expect(readRememberValue(`${REMEMBER_COOKIE}=1`)).toBe('1');
    expect(readRememberValue(`a=b; ${REMEMBER_COOKIE}=pending; c=d`)).toBe(
      REMEMBER_PENDING,
    );
    expect(readRememberValue(`${REMEMBER_COOKIE}=0`)).toBe('0');
    expect(readRememberValue(null)).toBeNull();
    expect(readRememberValue('other=1')).toBeNull();
  });

  it('hanya nilai 1 yang dianggap sesi persisten', () => {
    expect(isRemembered(`${REMEMBER_COOKIE}=1`)).toBe(true);
    expect(isRemembered(`${REMEMBER_COOKIE}=pending`)).toBe(false);
    expect(isRemembered(`${REMEMBER_COOKIE}=0`)).toBe(false);
    expect(isRemembered('')).toBe(false);
  });

  it('header persisten 30 hari + atribut keamanan tanpa HttpOnly', () => {
    const header = rememberCookieHeader('1', true);
    expect(header).toContain(`${REMEMBER_COOKIE}=1`);
    expect(header).toContain(`Max-Age=${REMEMBER_MAX_AGE}`);
    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Secure');
    expect(header).not.toContain('HttpOnly');
  });

  it('header sesi default tidak punya Max-Age', () => {
    const header = rememberCookieHeader('0', false);
    expect(header).toContain(`${REMEMBER_COOKIE}=0`);
    expect(header).not.toContain('Max-Age');
    expect(header).not.toContain('Expires');
  });

  it('pending OAuth hanya 10 menit', () => {
    const header = rememberCookieHeader(REMEMBER_PENDING, false);
    expect(header).toContain(`Max-Age=${REMEMBER_PENDING_MAX_AGE}`);
  });

  it('logout menghapus cookie penanda (Max-Age=0)', () => {
    const header = clearRememberCookieHeader(false);
    expect(header).toContain(`${REMEMBER_COOKIE}=`);
    expect(header).toContain('Max-Age=0');
  });
});

describe('isSecureRequest — deteksi HTTPS di balik proxy', () => {
  const request = (headers: Record<string, string> = {}) =>
    new Request('http://internal.local/auth/email', { headers });

  it('URL https atau x-forwarded-proto https', () => {
    expect(
      isSecureRequest({ url: new URL('https://form.example'), request: request() }),
    ).toBe(true);
    expect(
      isSecureRequest({
        url: new URL('http://internal.local'),
        request: request({ 'x-forwarded-proto': 'https' }),
      }),
    ).toBe(true);
  });

  it('http biasa (localhost) tidak memaksa Secure', () => {
    expect(
      isSecureRequest({ url: new URL('http://localhost:4321'), request: request() }),
    ).toBe(false);
  });
});
