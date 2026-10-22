/**
 * slug.ts — pembentukan slug form (T-40).
 * Aturan TASK 4.3/4.7: huruf kecil/angka/tanda '-', unik lintas pengguna,
 * dan slug yang dicadangkan DITOLAK (bukan diperbaiki diam-diam; pembentuk
 * dur bertugas menambahkan suffix acak bila bentrok).
 */
import { RESERVED_SLUGS } from '../../lib/config/limits';

export const SLUG_MAX = 60;
const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Judul/tulisan bebas → slug URL; kosong → slug acak. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, '');
  return base === '' ? randomSlug() : base;
}

/** Tambah suffix acak agar menembus bentrok — dipakai on-conflict saat insert. */
export function withSuffix(slug: string): string {
  const stem = slug.slice(0, SLUG_MAX - 6);
  return `${stem}-${randomSuffix()}`;
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

function randomSlug(): string {
  return `form-${randomSuffix()}`;
}

/** Slug terlarang? (admin, f, dashboard, ...) — validator form akan menolak; UI mencegah. */
export function isReserved(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

/** Untuk input manual: bersihkan → boleh dipakai tidak? */
export function sanitizeCandidate(input: string): { slug: string | null; reason?: string } {
  const slug = slugify(input);
  if (isReserved(slug)) return { slug: null, reason: `slug "${slug}" dicadangkan` };
  if (!SLUG_OK.test(slug)) return { slug: null, reason: 'slug tidak valid' };
  return { slug };
}
