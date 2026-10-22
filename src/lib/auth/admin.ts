/**
 * src/lib/auth/admin.ts — Helper otorisasi admin & moderasi (Epic B, Zona A).
 * Memeriksa apakah user memiliki hak akses admin berdasarkan:
 * 1. user.app_metadata.role === 'admin'
 * 2. Email tercantum di environment variable ADMIN_EMAILS (koma-terpisah).
 */

export interface AdminUserLike {
  email?: string | null;
  app_metadata?: {
    role?: unknown;
    [key: string]: unknown;
  } | null;
}

export function parseAdminEmails(raw?: string | null): Set<string> {
  if (!raw || typeof raw !== 'string') return new Set();
  const list = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return new Set(list);
}

export function getAdminEmailsEnv(): string {
  const meta = (import.meta as unknown as { env?: { ADMIN_EMAILS?: string } }).env?.ADMIN_EMAILS;
  if (typeof meta === 'string') return meta;
  const proc = (globalThis as unknown as { process?: { env?: { ADMIN_EMAILS?: string } } }).process;
  if (proc?.env?.ADMIN_EMAILS) {
    return proc.env.ADMIN_EMAILS;
  }
  return '';
}

export function isAdmin(user: AdminUserLike | null | undefined, envOverride?: string): boolean {
  if (!user) return false;

  // 1. Cek app_metadata role
  if (user.app_metadata && user.app_metadata.role === 'admin') {
    return true;
  }

  // 2. Cek email whitelist
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  const allowed = parseAdminEmails(envOverride !== undefined ? envOverride : getAdminEmailsEnv());
  return allowed.has(email);
}
