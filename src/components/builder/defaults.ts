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

/** Form kosong: tanpa blok (preview menampilkan catatan kosong). */
export function emptyState(title = 'Form tanpa judul'): BuilderState {
  return { title, theme: defaultTheme(), blocks: [] };
}

/** Lengkapi field opsional agar sesuai tipe BlockDraft (data dari DB/templates). */
function normalizeBlock(raw: unknown): BlockDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const id = String(b.id ?? '');
  switch (b.type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        text: String(b.text ?? ''),
        size: (['s', 'm', 'l', 'xl'] as const).includes(b.size as never) ? (b.size as 'm') : 'm',
        align: String(b.align ?? 'left'),
      };
    case 'text':
      return { id, type: 'text', text: String(b.text ?? '') };
    case 'image':
      return { id, type: 'image', publicId: String(b.publicId ?? ''), align: String(b.align ?? 'center') };
    case 'divider':
      return { id, type: 'divider' };
    case 'question':
      return {
        id,
        type: 'question',
        kind: String(b.kind ?? 'short_text'),
        label: String(b.label ?? ''),
        required: Boolean(b.required),
        options: Array.isArray(b.options) ? (b.options as string[]) : [],
        min: typeof b.min === 'number' ? b.min : null,
        max: typeof b.max === 'number' ? b.max : null,
        maxLength: typeof b.maxLength === 'number' ? b.maxLength : null,
      };
    default:
      return null;
  }
}

/** Schema JSON (dari tabel/templates) → BuilderState utk editor. */
export function stateFromRow(row: { title: string; schema: unknown }): BuilderState {
  const data = (row.schema ?? {}) as { theme?: Partial<ThemeDraft>; blocks?: unknown };
  const blocks = Array.isArray(data.blocks)
    ? (data.blocks.map(normalizeBlock).filter((b): b is BlockDraft => b !== null))
    : [];
  return {
    title: row.title,
    theme: { ...defaultTheme(), ...(data.theme ?? {}) },
    blocks,
  };
}
