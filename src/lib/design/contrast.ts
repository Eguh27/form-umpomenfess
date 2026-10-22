/**
 * Util cek kontras (T-32). Dipakai validator tema & test token,
 * agar kombinasi warna pembuat form yang tak terbaca ditolak
 * (TASK.md §7: "Validasi kontras minimal antara teks dan latar tema").
 *
 * Standar: WCAG 2.1 — rasio ≥ 4.5:1 untuk teks normal,
 * ≥ 3:1 untuk teks besar (≥ 24px, atau ≥ 18.66px bold).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parse warna `#rgb` / `#rrggbb`. Melempar Error untuk format lain. */
export function parseHex(hex: string): Rgb {
  if (!HEX_RE.test(hex)) {
    throw new Error(`Warna harus hex #rgb / #rrggbb, dapat: "${hex}"`);
  }
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Luminansi relatif WCAG (0..1). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Rasio kontras WCAG (1..21) untuk dua warna hex. */
export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(parseHex(fgHex));
  const l2 = relativeLuminance(parseHex(bgHex));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export type TextSize = 'normal' | 'large';

/** Apakah pasangan fg/bg terbaca? (large: ≥3:1, normal: ≥4.5:1) */
export function isReadable(fgHex: string, bgHex: string, size: TextSize = 'normal'): boolean {
  return contrastRatio(fgHex, bgHex) >= (size === 'large' ? 3 : 4.5);
}

/** Pilih warna teks paling terbaca dari kandidat untuk sebuah latar. */
export function bestTextColor(bgHex: string, candidates: string[], size: TextSize = 'normal'): string {
  let best = candidates[0];
  let bestRatio = contrastRatio(candidates[0], bgHex);
  for (const c of candidates) {
    const ratio = contrastRatio(c, bgHex);
    if (ratio > bestRatio) [best, bestRatio] = [c, ratio];
  }
  if (bestRatio < (size === 'large' ? 3 : 4.5)) {
    throw new Error(
      `Tidak ada kandidat teks yang cukup kontras di atas ${bgHex} ` +
        `(terbaik ${best} = ${bestRatio.toFixed(2)}:1, butuh ${size === 'large' ? 3 : 4.5}:1)`,
    );
  }
  return best;
}
