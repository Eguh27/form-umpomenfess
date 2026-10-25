/**
 * blockLabels.ts — bahasa Indonesia untuk jenis blok, pertanyaan, tema, dan issue.
 * Satu sumber label agar palette, struktur, properti, dan pesan validasi konsisten.
 */
import type {
  BlockAlign,
  CardStyle,
  FormFont,
  HeadingSize,
  QuestionKind,
} from '../../lib/forms/schema';
import type { BlockDraft } from './defaults';
import { isPageBreak } from './pages';

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  short_text: 'Teks singkat',
  paragraph: 'Paragraf',
  single_choice: 'Pilihan tunggal',
  multiple_choice: 'Pilihan ganda',
  dropdown: 'Menu pilihan',
  scale: 'Skala',
};

export const CARD_STYLE_LABELS: Record<CardStyle, string> = {
  menfess: 'Kaca',
  plain: 'Polos',
  soft: 'Lembut',
};

export const HEADING_SIZE_LABELS: Record<HeadingSize, string> = {
  s: 'Kecil',
  m: 'Sedang',
  l: 'Besar',
  xl: 'Sangat besar',
};

export const ALIGN_LABELS: Record<BlockAlign, string> = {
  left: 'Kiri',
  center: 'Tengah',
  right: 'Kanan',
};

export const FONT_LABELS: Record<FormFont, string> = {
  'system-ui': 'Sistem',
  Quicksand: 'Quicksand',
  'Baloo 2': 'Baloo 2',
  Georgia: 'Georgia',
};

export const BLOCK_TYPE_LABELS: Record<BlockDraft['type'], string> = {
  heading: 'Judul',
  text: 'Teks',
  image: 'Gambar',
  divider: 'Garis pembatas',
  question: 'Pertanyaan',
};

/** Ringkasan singkat satu blok untuk daftar struktur. */
export function blockSummary(block: BlockDraft): string {
  if (isPageBreak(block)) return 'Pemisah halaman';
  if (block.type === 'heading' || block.type === 'text') {
    return block.text.trim() === '' ? `${BLOCK_TYPE_LABELS[block.type]} belum diisi` : block.text;
  }
  if (block.type === 'question') {
    const kind = QUESTION_KIND_LABELS[block.kind as QuestionKind] ?? 'Pertanyaan';
    return block.label.trim() === '' ? `${kind} belum diisi` : block.label;
  }
  if (block.type === 'image') {
    return block.publicId.trim() === '' ? 'Gambar belum diisi' : 'Gambar';
  }
  return BLOCK_TYPE_LABELS.divider;
}

/** Index blok dari path issue ("blocks.2.options" → 2), atau null. */
export function blockIndexFromIssuePath(path: string): number | null {
  const match = /^blocks\.(\d+)/.exec(path);
  if (match === null) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? index : null;
}
