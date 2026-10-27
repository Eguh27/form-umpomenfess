/**
 * src/lib/auth/origin.ts — origin publik untuk URL redirect auth (T-13/T-15).
 *
 * Kenapa tidak langsung `context.url.origin`? Di balik proxy (Vercel), host
 * yang dilihat proses server bisa berupa host internal (`localhost:3000`),
 * sedangkan host yang dibuka pengguna ada di `x-forwarded-host`. Origin yang
 * salah membuat Supabase menolak `redirect_to` lalu jatuh ke Site URL
 * (gejalanya: setelah login Google pengguna dilempar ke localhost).
 *
 * Urutan resolusi:
 *   1. mode dev        → origin request (localhost) supaya login lokal tetap jalan
 *   2. x-forwarded-host → domain yang benar-benar dibuka pengguna (prod & preview)
 *   3. PUBLIC_SITE_URL  → domain kanonik sebagai cadangan
 *   4. origin request   → fallback terakhir
 *
 * Catatan: domain hasil resolusi TETAP harus terdaftar di Supabase
 * Authentication → URL Configuration → Redirect URLs. Supabase tidak pernah
 * memakai `redirect_to` di luar allowlist; ia diam-diam kembali ke Site URL.
 */
import type { APIContext } from 'astro';

export interface OriginRequestContext {
  request: Pick<Request, 'headers'>;
  url: URL;
}

export interface OriginOptions {
  /** Paksa mode dev/prod (dipakai test); default mengikuti import.meta.env. */
  dev?: boolean;
  /** Override PUBLIC_SITE_URL (dipakai test). */
  configuredSiteUrl?: string;
}

/** Nilai pertama dari header yang mungkin berisi daftar dipisah koma. */
function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/** Normalisasi URL menjadi origin murni (`https://host[:port]`); null bila tidak sah. */
export function toOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Bangun origin dari `x-forwarded-host` + `x-forwarded-proto` bila tersedia. */
function forwardedOrigin(headers: Headers): string | null {
  const host = firstHeaderValue(headers.get('x-forwarded-host'));
  if (!host) return null;

  const protoHeader = firstHeaderValue(headers.get('x-forwarded-proto'))?.toLowerCase();
  const proto = protoHeader === 'http' || protoHeader === 'https' ? protoHeader : 'https';

  return toOrigin(`${proto}://${host}`);
}

/**
 * Origin publik yang aman dipakai untuk `redirectTo` / `emailRedirectTo`.
 * Jangan pakai hasilnya untuk keputusan otorisasi — hanya untuk URL.
 */
export function resolvePublicOrigin(
  context: OriginRequestContext,
  options: OriginOptions = {},
): string {
  const isDev = options.dev ?? import.meta.env.DEV;
  if (isDev) return context.url.origin;

  const forwarded = forwardedOrigin(context.request.headers);
  if (forwarded) return forwarded;

  const configured = toOrigin(options.configuredSiteUrl ?? import.meta.env.PUBLIC_SITE_URL);
  if (configured) return configured;

  return context.url.origin;
}

/** Pintasan untuk APIContext Astro. */
export function publicOriginOf(context: APIContext, options: OriginOptions = {}): string {
  return resolvePublicOrigin(context, options);
}
