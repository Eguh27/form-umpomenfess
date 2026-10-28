/**
 * rateLimit.ts — pembatas submit per IP (T-51/E-A2).
 * Pluggable store: default MemoryRateLimitStore (zero-dependency, bounded FIFO).
 *
 * PRODUKSI: hanya MemoryRateLimitStore yang diimplementasikan. Di serverless
 * (Vercel) store ini per-instance, jadi batas TIDAK global dan tidak boleh
 * diandalkan sebagai satu-satunya kontrol anti-spam. Kontrol utama tetap
 * Turnstile (fail-closed) + kuota respons; Redis/Upstash belum terpasang
 * (lihat TODO T-82).
 */

export const RATE_LIMIT = {
  windowMs: 60_000,
  /** maksimal submit yang diterima dalam satu jendela per IP. */
  maxPerWindow: 10,
  /** maksimal entri disimpan per IP (batas memori). */
  keepEntries: 50,
} as const;

export interface RateLimitStore {
  readonly name: string;
  check(key: string, now: number, max: number, windowMs: number): boolean | Promise<boolean>;
  reset(): void | Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  readonly name = 'memory';
  private hits = new Map<string, number[]>();

  check(key: string, now: number, max: number, windowMs: number): boolean {
    if (this.hits.size > 10_000) this.hits.clear();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      list.push(now);
      this.hits.set(key, list.slice(-RATE_LIMIT.keepEntries));
      return false;
    }
    list.push(now);
    this.hits.set(key, list.slice(-RATE_LIMIT.keepEntries));
    return true;
  }

  reset(): void {
    this.hits.clear();
  }
}

let activeStore: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(store: RateLimitStore): void {
  activeStore = store;
}

export function getRateLimitStore(): RateLimitStore {
  return activeStore;
}

/** IP dari header proxy (Vercel: x-forwarded-for) — IP pertama. */
export function ipFromHeaders(headers: Headers): string {
  const f = headers.get('x-forwarded-for');
  if (f !== null && f !== '') {
    const first = f.split(',')[0]?.trim();
    if (first !== '') return first;
  }
  return headers.get('x-real-ip') ?? '0.0.0.0';
}

/**
 * true = izinkan dan CATAT; false = limit kena.
 * Mendukung sync & async store (Promise auto-unwrapped jika di-await).
 */
export function checkAndRecord(
  ip: string,
  now: number = Date.now(),
  max: number = RATE_LIMIT.maxPerWindow,
): boolean | Promise<boolean> {
  return activeStore.check(ip, now, max, RATE_LIMIT.windowMs);
}

/** Reset store (untuk test). */
export function resetRateLimit(): void | Promise<void> {
  return activeStore.reset();
}

