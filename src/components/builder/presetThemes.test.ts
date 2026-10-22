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
});
