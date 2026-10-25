/**
 * presetThemes.ts — preset tema siap pakai untuk pembuat form (T-45, Zona B).
 *
 * Semua preset HANYA memakai nilai yang lolos whitelist schema.ts:
 * - font: 'Quicksand' | 'Baloo 2' | 'system-ui' | 'Georgia'
 * - cardStyle: 'menfess' | 'plain' | 'soft'
 * - hex #rrggbb 6-digit valid
 * - radius: 0 - 48
 *
 * Preset dasar (bawaan) + koleksi musiman "Autumn" (12 palet, T-75) yang
 * menyertakan varian gelap — tetap dipetakan ke kontrak tema flat yang sama.
 */
import type { ThemeDraft } from './defaults';
import {
  AUTUMN_COLLECTION,
  AUTUMN_PALETTES,
  paletteToTheme,
  type ThemeVariant,
} from '../../lib/forms/themePresets';

export interface ThemePreset {
  id: string;
  name: string;
  category: 'Menfess' | 'Minimalis' | 'Pastel' | 'Elegan' | 'Modern' | 'Autumn';
  description: string;
  theme: ThemeDraft;
  /** Varian gelap opsional (hanya palet musiman yang menyertakan token dark mode). */
  darkTheme?: ThemeDraft;
}

const BASE_PRESET_THEMES: ThemePreset[] = [
  {
    id: 'kaca-blush',
    name: 'Kaca Blush',
    category: 'Menfess',
    description: 'Palet asli UMPOMenfess: blush lembut, aksen koral, dan teks teal.',
    theme: {
      bg: '#fdeeec',
      accent: '#e8604c',
      text: '#1f4d46',
      font: 'Quicksand',
      radius: 18,
      cardStyle: 'menfess',
      bannerPublicId: null,
    },
  },
  {
    id: 'mint-segar',
    name: 'Mint Segar',
    category: 'Menfess',
    description: 'Nuansa hijau mint segar khas menfess kampus, tenang & ramah responden.',
    theme: {
      bg: '#edfbf7',
      accent: '#2f7263',
      text: '#123831',
      font: 'Quicksand',
      radius: 20,
      cardStyle: 'menfess',
      bannerPublicId: null,
    },
  },
  {
    id: 'lavender-soft',
    name: 'Lavender Soft',
    category: 'Pastel',
    description: 'Warna ungu pastel yang menyejukkan, cocok untuk kuesioner psikologi/sosial.',
    theme: {
      bg: '#f5f3ff',
      accent: '#7c3aed',
      text: '#2e1065',
      font: 'Quicksand',
      radius: 16,
      cardStyle: 'soft',
      bannerPublicId: null,
    },
  },
  {
    id: 'koral-sunset',
    name: 'Koral Sunset',
    category: 'Pastel',
    description: 'Hangat dan ceria dengan aksen jingga koral, menarik untuk survei mahasiswa.',
    theme: {
      bg: '#fff7ed',
      accent: '#ea580c',
      text: '#431407',
      font: 'Baloo 2',
      radius: 16,
      cardStyle: 'menfess',
      bannerPublicId: null,
    },
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    category: 'Modern',
    description: 'Perpaduan biru laut dan teal yang profesional untuk penelitian formal.',
    theme: {
      bg: '#f0fdfa',
      accent: '#0d9488',
      text: '#134e4a',
      font: 'system-ui',
      radius: 12,
      cardStyle: 'plain',
      bannerPublicId: null,
    },
  },
  {
    id: 'krem-akademik',
    name: 'Krem Akademik',
    category: 'Elegan',
    description: 'Kertas krem klasik dengan tipografi Georgia berserif untuk skripsi resmi.',
    theme: {
      bg: '#fafaf9',
      accent: '#78716c',
      text: '#1c1917',
      font: 'Georgia',
      radius: 8,
      cardStyle: 'plain',
      bannerPublicId: null,
    },
  },
  {
    id: 'dark-slate',
    name: 'Dark Modern',
    category: 'Modern',
    description: 'Gaya gelap elegan dengan teks kontras tinggi, nyaman di mata malam hari.',
    theme: {
      bg: '#0f172a',
      accent: '#38bdf8',
      text: '#f8fafc',
      font: 'system-ui',
      radius: 14,
      cardStyle: 'soft',
      bannerPublicId: null,
    },
  },
  {
    id: 'monokrom-bersih',
    name: 'Monokrom Bersih',
    category: 'Minimalis',
    description: 'Putih bersih dengan garis tegas, simpel dan cepat dibaca responden.',
    theme: {
      bg: '#ffffff',
      accent: '#2563eb',
      text: '#1e293b',
      font: 'system-ui',
      radius: 10,
      cardStyle: 'plain',
      bannerPublicId: null,
    },
  },
];

const AUTUMN_PRESET_THEMES: ThemePreset[] = AUTUMN_PALETTES.map((palette) => ({
  id: palette.id,
  name: `${palette.code} · ${palette.name}`,
  category: 'Autumn',
  description: `${palette.description} — ${AUTUMN_COLLECTION.title}.`,
  theme: paletteToTheme(palette, 'light'),
  darkTheme: paletteToTheme(palette, 'dark'),
}));

export const PRESET_THEMES: ThemePreset[] = [...BASE_PRESET_THEMES, ...AUTUMN_PRESET_THEMES];

/**
 * Terapkan preset tema dengan tetap mempertahankan banner yang sudah diunggah.
 * `variant: 'dark'` memakai varian gelap bila tersedia; selain itu jatuh ke tema terang.
 */
export function applyThemePreset(
  preset: ThemePreset,
  currentBanner: string | null = null,
  variant: ThemeVariant = 'light',
): ThemeDraft {
  const base = variant === 'dark' ? (preset.darkTheme ?? preset.theme) : preset.theme;
  return {
    ...base,
    bannerPublicId: currentBanner ?? base.bannerPublicId,
  };
}
