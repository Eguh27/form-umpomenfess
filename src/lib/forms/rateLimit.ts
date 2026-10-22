/**
 * rateLimit.ts — pembatas submit per IP (T-51), in-memory utk MVP.
 * Catatan: pada serverless tiap instance punya map sendiri — cukup memperlambat
 * Abuse dasar; rate hard-scale menyusul (Upstash) bila dibutuhkan. Besar jendela
 * & batas di satu file: ubah di sini (TASK 4.2 menyebut limit per IP).
 */

export const RATE_LIMIT = {
  windowMs: 60_000,
  /** maksimal submit yang diterima dalam satu jendela per IP. */
  maxPerWindow: 10,
  /** maksimal entri disimpan per IP (batas memori). */
  keepEntries: 50,
} as const;

const hits = new Map<string, number[]>();

/** IP dari header proxy (Vercel: x-forwarded-for berantakan?) — IP pertama. */
export function ipFromHeaders(headers: Headers): string {
  const f = headers.get('x-forwarded-for');
  if (f !== null && f !== '') {
    const first = f.split(',')[0]?.trim();
    if (first !== '') return first;
  }
  return headers.get('x-real-ip') ?? '0.0.0.0';
}

/**
 * true = izinkan dan CATAT; false = limit kena (dicatat juga, agar window
 * bergeser). `max` opsional untuk endpoint yang lebih kencang batasnya
 * (mis. laporan: 5/menit) tanpa menyentuh konstanta default submit.
 */
export function checkAndRecord(ip: string, now: number = Date.now(), max: number = RATE_LIMIT.maxPerWindow): boolean {
  // S4/R3: jaga memori — jumlah IP unik dibatasi kasar (flood banyak IP).
  if (hits.size > 10_000) hits.clear();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (list.length >= max) {
    list.push(now);
    hits.set(ip, list.slice(-RATE_LIMIT.keepEntries));
    return false;
  }
  list.push(now);
  hits.set(ip, list.slice(-RATE_LIMIT.keepEntries));
  return true;
}

/** Reset map (untuk test). */
export function resetRateLimit(): void {
  hits.clear();
}
