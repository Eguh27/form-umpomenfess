/**
 * src/lib/auth/session.ts — kebijakan masa hidup cookie sesi (T-80, Agent A).
 *
 * Dua mode:
 *  - default  : cookie SESI (tanpa Max-Age/Expires) → hilang saat browser ditutup.
 *  - "Ingat saya" : cookie persisten 30 hari.
 *
 * Catatan penting @supabase/ssr: library menulis cookie auth dengan maxAge
 * default 400 hari dan selalu menimpa maxAge yang kita kirim. Karena itu
 * kebijakan di sini diterapkan di adaptor cookie kita (server & browser),
 * bukan lewat opsi `cookieOptions` library.
 *
 * Cookie penanda `umpf_ingat` sengaja tidak httpOnly: client browser membaca
 * preferensi ini agar refresh token di tab tidak mengubah sesi menjadi
 * persisten 400 hari. Nilainya bukan rahasia (hanya "0"/"1"/"pending").
 */
import {
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from '@supabase/ssr';

export const REMEMBER_COOKIE = 'umpf_ingat';
export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
export const REMEMBER_PENDING_MAX_AGE = 10 * 60;
export const REMEMBER_PENDING = 'pending';

export type RememberValue = '0' | '1' | typeof REMEMBER_PENDING;

/** Baca nilai cookie penanda dari header Cookie (null bila tidak ada). */
export function readRememberValue(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const found = parseCookieHeader(cookieHeader).find(
    (cookie) => cookie.name === REMEMBER_COOKIE,
  );
  return found?.value ?? null;
}

export function hasRememberCookie(cookieHeader: string | null): boolean {
  return readRememberValue(cookieHeader) !== null;
}

/** Hanya nilai "1" yang membuat sesi persisten. */
export function isRemembered(cookieHeader: string | null): boolean {
  return readRememberValue(cookieHeader) === '1';
}

/**
 * Terapkan kebijakan sesi ke opsi cookie yang diberikan @supabase/ssr.
 * - maxAge 0 = penghapusan cookie → biarkan.
 * - remember  = 30 hari.
 * - default   = hapus maxAge/expires → cookie sesi.
 * `secure` dipaksa true bila request lewat HTTPS.
 */
export function sessionCookieOptions(
  options: CookieOptions,
  remember: boolean,
  secure: boolean,
): CookieOptions {
  const next: CookieOptions = { ...options };
  if (next.maxAge !== 0) {
    if (remember) {
      next.maxAge = REMEMBER_MAX_AGE;
      delete next.expires;
    } else {
      delete next.maxAge;
      delete next.expires;
    }
  }
  if (secure) next.secure = true;
  return next;
}

/** Opsi cookie penanda; `pending` dipakai hanya selama alur OAuth. */
export function rememberCookieOptions(
  value: RememberValue,
  secure: boolean,
): CookieOptions {
  const maxAge =
    value === REMEMBER_PENDING
      ? REMEMBER_PENDING_MAX_AGE
      : value === '1'
        ? REMEMBER_MAX_AGE
        : undefined;
  return {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure,
    maxAge,
  };
}

export function rememberCookieHeader(
  value: RememberValue,
  secure: boolean,
): string {
  return serializeCookieHeader(
    REMEMBER_COOKIE,
    value,
    rememberCookieOptions(value, secure),
  );
}

export function clearRememberCookieHeader(secure: boolean): string {
  return serializeCookieHeader(REMEMBER_COOKIE, '', {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure,
    maxAge: 0,
  });
}

/** Tempel Set-Cookie penanda ke Response (dipakai endpoint auth). */
export function withRememberCookie(
  response: Response,
  value: RememberValue,
  secure: boolean,
): Response {
  response.headers.append('Set-Cookie', rememberCookieHeader(value, secure));
  return response;
}

/** Hapus cookie penanda (logout / alur OAuth gagal). */
export function withClearedRememberCookie(
  response: Response,
  secure: boolean,
): Response {
  response.headers.append('Set-Cookie', clearRememberCookieHeader(secure));
  return response;
}

/** HTTPS asli (di balik proxy Vercel: x-forwarded-proto). */
export function isSecureRequest(context: {
  url: URL;
  request: Pick<Request, 'headers'>;
}): boolean {
  if (context.url.protocol === 'https:') return true;
  const forwarded = context.request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  return forwarded === 'https';
}
