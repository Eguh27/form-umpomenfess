/**
 * src/lib/auth/supabase.ts — helper client Supabase SSR (T-13, Agent A).
 *
 * Dua pola adaptor cookie @supabase/ssr, sesuai dokumentasi resmi:
 *  1. createAstroCookiesClient — untuk `src/middleware.ts`: tulis cookie lewat
 *     Astro (`context.cookies.set`) supaya Astro yang menyusun Set-Cookie.
 *  2. createBufferedClient — untuk endpoint yang MENGEMBALIKAN Response sendiri
 *     (OAuth mulai/callback/logout): cookie & header anti-cache di-buff lalu
 *     ditempel manual ke Response (pola sama dengan contoh resmi SS framework).
 *
 * Secret service role TIDAK PERNAH dipakai di sini (hanya anon key, publik).
 */

import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions as SupabaseCookieOptions,
} from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { APIContext, AstroCookieSetOptions } from 'astro';
import { isSecureRequest, sessionCookieOptions } from './session';

/** Kebijakan sesi per-request: default cookie sesi, "ingat saya" 30 hari. */
export interface SessionPolicy {
  remember: boolean;
  /** Paksa Secure; default diturunkan dari URL/x-forwarded-proto. */
  secure?: boolean;
}

export interface SupabaseEnvConfig {
  url: string;
  anonKey: string;
}

/** Baca env public; null kalau belum diisi (dev/build tanpa env tetap jalan). */
export function getEnvConfig(): SupabaseEnvConfig | null {
  const url: string = import.meta.env.PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey: string = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (url === '' || anonKey === '') return null;
  return { url, anonKey };
}

/** Adaptor supabase CookieOptions → AstroCookieSetOptions (field yang didukung). */
function toAstroOptions(options: SupabaseCookieOptions): AstroCookieSetOptions {
  const astro: AstroCookieSetOptions = {};
  if (options.domain  !== undefined) astro.domain  = options.domain;
  if (options.path    !== undefined) astro.path    = options.path;
  if (options.maxAge  !== undefined) astro.maxAge  = options.maxAge;
  if (options.httpOnly !== undefined) astro.httpOnly = options.httpOnly;
  if (options.secure  !== undefined) astro.secure  = options.secure;
  if (options.expires !== undefined) astro.expires = options.expires as AstroCookieSetOptions['expires'];
  if (options.sameSite !== undefined) {
    astro.sameSite = options.sameSite as AstroCookieSetOptions['sameSite'];
  }
  return astro;
}

/**
 * Client anon murni TANPA cookie sesi — untuk permukaan publik (`/f/*`,
 * laporan responden). Dengan begini user yang sedang login tetap membaca
 * lewat role `anon`, sehingga tidak butuh policy SELECT published untuk
 * `authenticated` pada tabel `forms` (yang akan membocorkan `owner_id`).
 */
export function createAnonClient(config: SupabaseEnvConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Client ber-integrasi cookie Astro — dipakai middleware (per-request). */
export function createAstroCookiesClient(
  context: APIContext,
  config: SupabaseEnvConfig,
  policy: SessionPolicy = { remember: false },
): SupabaseClient {
  const remember = policy.remember;
  const secure = policy.secure ?? isSecureRequest(context);
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          context.cookies.set(
            name,
            value,
            toAstroOptions(sessionCookieOptions(options, remember, secure)),
          );
        }
      },
    },
  });
}

/**
 * Client ber-buffer untuk endpoint dengan Response buatan sendiri:
 * Seluruh cookie hasil auth (mulai PKCE, refresh, logout) di-buff, lalu
 * `flush(response)` menempelkannya + header anti-cache (wajib saat auth cookie
 * ditulis supaya tidak ter-cache CDN/proxy).
 */
export function createBufferedClient(
  request: Request,
  config: SupabaseEnvConfig,
  policy: SessionPolicy = { remember: false },
): {
  supabase: SupabaseClient;
  /** Tempel header hasil auth ke Response, wajib dipanggil sebelum return. */
  flush: (response: Response) => Response;
} {
  const pendingCookies: string[] = [];
  const cacheHeaders: Record<string, string> = {};
  const remember = policy.remember;
  const secure =
    policy.secure ??
    isSecureRequest({ url: new URL(request.url), request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '');
      },
      setAll(cookiesToSet, headers) {
        if (headers && Object.keys(headers).length > 0) {
          Object.assign(cacheHeaders, headers);
        }
        for (const { name, value, options } of cookiesToSet) {
          pendingCookies.push(
            serializeCookieHeader(
              name,
              value,
              sessionCookieOptions(options, remember, secure),
            ),
          );
        }
      },
    },
  });

  const flush = (response: Response): Response => {
    for (const [key, value] of Object.entries(cacheHeaders)) {
      response.headers.set(key, value);
    }
    for (const cookie of pendingCookies) {
      response.headers.append('Set-Cookie', cookie);
    }
    return response;
  };

  return { supabase, flush };
}
