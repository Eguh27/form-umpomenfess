import { describe, expect, it } from 'vitest';
import { isReadable } from '../design/contrast';
import { themeSchema } from './schema';
import { AUTUMN_COLLECTION, AUTUMN_PALETTES, paletteToTheme } from './themePresets';

describe('themePresets — koleksi Autumn', () => {
  it('memuat 12 palet dengan id prefiks autumn- dan kode 01–12', () => {
    expect(AUTUMN_PALETTES).toHaveLength(12);
    const ids = AUTUMN_PALETTES.map((palette) => palette.id);
    expect(new Set(ids).size).toBe(12);
    for (const id of ids) expect(id).toMatch(/^autumn-(0[1-9]|1[0-2])$/);
    expect(AUTUMN_PALETTES.map((palette) => palette.code)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    );
    expect(AUTUMN_COLLECTION.title).toBe('Autumn Color Palettes');
  });

  it('mempertahankan identitas dari brief (nama, hex, usage)', () => {
    const pumpkin = AUTUMN_PALETTES[0];
    expect(pumpkin.name).toBe('Pumpkin Spice');
    expect(pumpkin.colors[0]).toEqual({
      name: 'Cream Peach',
      hex: '#FFD8B6',
      usage: 'Soft background, highlights',
    });
    expect(pumpkin.dark.background).toEqual({
      name: 'Roasted Espresso',
      hex: '#1C120F',
      usage: 'Main app background',
    });
    expect(pumpkin.dark.border.name).toBe('Brown Border');

    for (const palette of AUTUMN_PALETTES) {
      const named = [...palette.colors, ...Object.values(palette.dark)];
      for (const { hex } of named) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('varian terang lolos themeSchema (whitelist) dan kontras WCAG', () => {
    for (const palette of AUTUMN_PALETTES) {
      const theme = paletteToTheme(palette, 'light');
      const parsed = themeSchema.safeParse(theme);
      expect(parsed.success, `varian terang "${palette.name}" harus lolos themeSchema`).toBe(true);
      expect(isReadable(theme.text, theme.bg), `kontras terang "${palette.name}"`).toBe(true);
    }
  });

  it('varian gelap lolos themeSchema (whitelist) dan kontras WCAG', () => {
    for (const palette of AUTUMN_PALETTES) {
      const theme = paletteToTheme(palette, 'dark');
      const parsed = themeSchema.safeParse(theme);
      expect(parsed.success, `varian gelap "${palette.name}" harus lolos themeSchema`).toBe(true);
      expect(isReadable(theme.text, theme.bg), `kontras gelap "${palette.name}"`).toBe(true);
    }
  });

  it('meneruskan font/radius/cardStyle dari karakter palet', () => {
    const cozy = AUTUMN_PALETTES.find((palette) => palette.code === '04');
    expect(cozy).toBeDefined();
    const theme = paletteToTheme(cozy!, 'light');
    expect(theme.font).toBe('Georgia');
    expect(theme.radius).toBe(12);
    expect(theme.cardStyle).toBe('plain');
    expect(theme.bannerPublicId).toBeNull();
  });
});
