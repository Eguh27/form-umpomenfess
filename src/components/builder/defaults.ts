/**
 * defaults.ts — titik awal form baru & draft state builder (T-40/T-41).
 *
 * Tema default mengikuti token situs (design/tokens.css): kaca · blush.
 * Catatan: font default masih `system-ui` karena FONT_WHITELIST (schema.ts,
 * zona @C) belum memuat Quicksand/Baloo 2 — contract change sedang diproses
 * (lihat TODO.md Requests). Ubah DEFAULT_FONT di sini saja begitu whitelist baru.
 */
import type { CardStyle, FormFont } from '../../lib/forms/schema';

/** Satu-satunya tempat font default; diubah saat whitelist diperbarui @C. */
export const DEFAULT_FONT: FormFont = 'system-ui';

export interface ThemeDraft {
  bg: string;
  accent: string;
  text: string;
  font: FormFont;
  radius: number;
  cardStyle: CardStyle;
  bannerPublicId: string | null;
}

export function defaultTheme(): ThemeDraft {
  return {
    bg: '#fdeeec',
    accent: '#e8604c',
    text: '#1f4d46',
    font: DEFAULT_FONT,
    radius: 16,
    cardStyle: 'menfess',
    bannerPublicId: null,
  };
}

/** Draft block di editor: belum tentu lolos validator (sedang diketik). */
export type BlockDraft =
  | { id: string; type: 'heading'; text: string; size: 's' | 'm' | 'l' | 'xl'; align: string }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'image'; publicId: string; align: string }
  | { id: string; type: 'divider' }
  | {
      id: string;
      type: 'question';
      kind: string;
      label: string;
      required: boolean;
      options: string[];
      min: number | null;
      max: number | null;
      maxLength: number | null;
    };

export interface BuilderState {
  title: string;
  theme: ThemeDraft;
  blocks: BlockDraft[];
}

/** Form kosong: teks pembuka agar preview tidak berongga. */
export function emptyState(title = 'Form tanpa judul'): BuilderState {
  return { title, theme: defaultTheme(), blocks: [] };
}

/** Konversi baris tabel `templates` → BuilderState awal (schema/theme sudah valid). */
export function stateFromTemplate(t: { title: string; schema: unknown }): BuilderState {
  const data = (t.schema ?? {}) as { theme?: Partial<ThemeDraft>; blocks?: unknown };
  return {
    title: t.title,
    theme: { ...defaultTheme(), ...(data.theme ?? {}) },
    blocks: Array.isArray(data.blocks) ? (data.blocks as BlockDraft[]) : [],
  };
}

/** Konversi row `forms` (schema jsonb) → BuilderState untuk editor. */
export function stateFromForm(row: { title: string; schemas: unknown }): BuilderState {
  return stateFromTemplate({ title: row.title, schema: row.schemas });
}
