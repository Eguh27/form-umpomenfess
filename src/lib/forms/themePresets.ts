/**
 * themePresets.ts — katalog palet tema musiman (identitas + pemetaan ke kontrak tema).
 *
 * Kontrak tema form (TASK.md §4.5) tetap flat: bg/accent/text/font/radius/cardStyle.
 * Palet menyimpan identitas lengkap dari brief (nama warna + usage + token dark mode),
 * lalu dipetakan menjadi varian "light" & "dark" yang keduanya lolos whitelist schema.
 *
 * Paket berikutnya (mis. "January") cukup menambah modul data dengan prefiks id sendiri
 * (mis. `january-01`) dan mendaftarkannya di sini — kontrak tidak perlu berubah.
 */
import type { CardStyle, FormFont, FormTheme } from './schema';
import { AUTUMN_PALETTES } from './themePresetsAutumn';

export interface NamedColor {
  name: string;
  hex: string;
  usage: string;
}

export interface PaletteDarkTokens {
  background: NamedColor;
  surface: NamedColor;
  surfaceElevated: NamedColor;
  text: NamedColor;
  textMuted: NamedColor;
  primary: NamedColor;
  accent: NamedColor;
  border: NamedColor;
}

export interface PaletteStyle {
  font: FormFont;
  radius: number;
  cardStyle: CardStyle;
}

export interface SeasonalPalette {
  /** Prefiks koleksi + nomor, mis. `autumn-01` (unik lintas koleksi). */
  id: string;
  /** Nomor asli dari brief, mis. `01`. */
  code: string;
  name: string;
  description: string;
  /** Urutan brief: latar, aksen tombol, aksen tautan, heading, teks kuat. */
  colors: readonly [NamedColor, NamedColor, NamedColor, NamedColor, NamedColor];
  dark: PaletteDarkTokens;
  style: PaletteStyle;
  /** Teks pengganti bila warna teks asli gagal kontras WCAG 4.5:1. */
  textOverride?: string;
}

export interface ThemeCollection {
  id: string;
  title: string;
  description: string;
}

export const AUTUMN_COLLECTION: ThemeCollection = {
  id: 'autumn',
  title: 'Autumn Color Palettes',
  description:
    'Dua belas palet musim gugur yang hangat dan earthy, masing-masing dengan varian terang dan gelap.',
};

export type ThemeVariant = 'light' | 'dark';

/** Petakan satu palet ke kontrak tema form (hasil selalu lolos themeSchema). */
export function paletteToTheme(
  palette: SeasonalPalette,
  variant: ThemeVariant = 'light',
): FormTheme {
  if (variant === 'dark') {
    return {
      bg: palette.dark.background.hex,
      accent: palette.dark.primary.hex,
      text: palette.dark.text.hex,
      font: palette.style.font,
      radius: palette.style.radius,
      cardStyle: palette.style.cardStyle,
      bannerPublicId: null,
    };
  }
  return {
    bg: palette.colors[0].hex,
    accent: palette.colors[1].hex,
    text: palette.textOverride ?? palette.colors[4].hex,
    font: palette.style.font,
    radius: palette.style.radius,
    cardStyle: palette.style.cardStyle,
    bannerPublicId: null,
  };
}

export { AUTUMN_PALETTES };
