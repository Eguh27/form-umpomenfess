import { describe, expect, it } from 'vitest';
import { themeSchema } from '../../lib/forms/schema';
import { isReadable } from '../../lib/design/contrast';
import { PRESET_THEMES, applyThemePreset } from './presetThemes';

describe('presetThemes.ts — preset tema', () => {
  it('semua preset tema lolos validasi themeSchema (whitelist font/cardStyle/hex)', () => {
    for (const preset of PRESET_THEMES) {
      const parsed = themeSchema.safeParse(preset.theme);
      expect(parsed.success, `Preset "${preset.name}" harus lolos themeSchema`).toBe(true);
    }
  });

  it('semua preset tema memiliki rasio kontras teks & latar yang terbaca (WCAG)', () => {
    for (const preset of PRESET_THEMES) {
      const readable = isReadable(preset.theme.text, preset.theme.bg);
      expect(readable, `Kontras preset "${preset.name}" harus memenuhi standar WCAG`).toBe(true);
    }
  });

  it('applyThemePreset mempertahankan banner yang sudah ada jika diberikan', () => {
    const preset = PRESET_THEMES[0];
    const applied = applyThemePreset(preset, 'form/existing_banner_123');
    expect(applied.bannerPublicId).toBe('form/existing_banner_123');
    expect(applied.bg).toBe(preset.theme.bg);
    expect(applied.font).toBe(preset.theme.font);
  });

  it('koleksi Autumn terdaftar lengkap: 12 preset dengan varian gelap valid', () => {
    const autumn = PRESET_THEMES.filter((preset) => preset.category === 'Autumn');
    expect(autumn).toHaveLength(12);
    for (const preset of autumn) {
      expect(preset.id).toMatch(/^autumn-/);
      expect(preset.darkTheme, `"${preset.name}" harus punya varian gelap`).toBeDefined();
      expect(themeSchema.safeParse(preset.darkTheme).success).toBe(true);
      expect(isReadable(preset.darkTheme!.text, preset.darkTheme!.bg)).toBe(true);
    }
  });

  it('applyThemePreset varian gelap memakai darkTheme dan tetap mempertahankan banner', () => {
    const preset = PRESET_THEMES.find((item) => item.category === 'Autumn')!;
    const applied = applyThemePreset(preset, 'form/banner_123', 'dark');
    expect(applied.bg).toBe(preset.darkTheme!.bg);
    expect(applied.accent).toBe(preset.darkTheme!.accent);
    expect(applied.bannerPublicId).toBe('form/banner_123');
  });

  it('varian gelap jatuh ke tema terang untuk preset tanpa darkTheme', () => {
    const preset = PRESET_THEMES.find((item) => item.darkTheme === undefined)!;
    const applied = applyThemePreset(preset, null, 'dark');
    expect(applied.bg).toBe(preset.theme.bg);
    expect(applied.accent).toBe(preset.theme.accent);
  });
});
