import { describe, expect, it } from 'vitest';
import {
  bestTextColor,
  contrastRatio,
  isReadable,
  parseHex,
  relativeLuminance,
} from './contrast';

// Token light (design/tokens.css) — dipasangkan dengan uji di bawah.
const LIGHT = {
  bg: '#FDEEEC',
  text: '#1F4D46',
  muted: '#4F6A62',
  brand: '#2F7263',
  onBrand: '#FFF6EA',
  pillBg: '#4A9A8B',
  onPill: '#FFF6EA',
  accent: '#E8604C',
};
// Token dark.
const DARK = {
  bg: '#16201E',
  text: '#F3EFE6',
  muted: '#9DB5AD',
  brand: '#2F7263',
  onBrand: '#FFF6EA',
  accent: '#E8604C',
};

describe('parseHex / relativeLuminance', () => {
  it('menerima #rgb dan #rrggbb, menolak format lain', () => {
    expect(parseHex('#abc')).toEqual(parseHex('#aabbcc'));
    expect(() => parseHex('red')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
  });

  it('luminansi: putih 1, hitam 0', () => {
    expect(relativeLuminance(parseHex('#ffffff'))).toBeCloseTo(1, 5);
    expect(relativeLuminance(parseHex('#000000'))).toBe(0);
  });
});

describe('contrastRatio', () => {
  it('kasus ekstrem WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('tidak bergantung urutan fg/bg', () => {
    expect(contrastRatio(LIGHT.text, LIGHT.bg)).toBeCloseTo(
      contrastRatio(LIGHT.bg, LIGHT.text),
      5,
    );
  });
});

describe('token light lolos WCAG', () => {
  it('teks utama di atas kbg blush (≥4.5)', () => {
    expect(contrastRatio(LIGHT.text, LIGHT.bg)).toBeGreaterThan(4.5);
    expect(isReadable(LIGHT.text, LIGHT.bg)).toBe(true);
  });

  it('teks sekunder (muted) di atas kbg (≥4.5)', () => {
    expect(contrastRatio(LIGHT.muted, LIGHT.bg)).toBeGreaterThan(4.5);
  });

  it('teks tombol (on-brand) di atas tombol teal (≥4.5)', () => {
    expect(contrastRatio(LIGHT.onBrand, LIGHT.brand)).toBeGreaterThan(4.5);
  });

  it('pill dekoratif tetap minimal 3:1 (style referensi template)', () => {
    expect(contrastRatio(LIGHT.onPill, LIGHT.pillBg)).toBeGreaterThan(3);
  });
});

describe('token dark lolos WCAG', () => {
  it('teks utama & muted di atas latar gelap (≥4.5)', () => {
    expect(contrastRatio(DARK.text, DARK.bg)).toBeGreaterThan(4.5);
    expect(contrastRatio(DARK.muted, DARK.bg)).toBeGreaterThan(4.5);
  });

  it('tombol tetap terbaca (≥4.5)', () => {
    expect(contrastRatio(DARK.onBrand, DARK.brand)).toBeGreaterThan(4.5);
  });

  it('aksen terbaca sebagai teks di latar gelap (≥3, teks besar/ikon)', () => {
    expect(contrastRatio(DARK.accent, DARK.bg)).toBeGreaterThan(3);
  });
});

describe('bestTextColor', () => {
  it('memilih kandidat dengan rasio tertinggi', () => {
    expect(bestTextColor(LIGHT.bg, ['#ffffff', LIGHT.text])).toBe(LIGHT.text);
  });

  it('melempar bila tak ada kandidat yang kontras', () => {
    expect(() => bestTextColor('#AAAAAA', ['#999999', '#BBBBBB'])).toThrow();
  });
});
