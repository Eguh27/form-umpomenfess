/**
 * serialize.ts — jembatan draft builder → schema JSON kontrak (T-44).
 *
 * Builder TIDAK PERNAH menyimpan payload mentah: hasil toPayload() selalu
 * lewat parseFormSchema() milik zona C (satu sumber kebenaran TASK 4.5).
 * Jika gagal → autosave dihentikan dan daftar issue ditampilkan. Teks user
 * disimpan apa adanya sebagai string (dirender ter-escape oleh React —
 * tidak ada jalur HTML mentah).
 */
import { FORM_SCHEMA_VERSION, parseFormSchema, type FormSchemaData, type SchemaIssue } from '../../lib/forms/schema';
import type { BlockDraft, BuilderState, ThemeDraft } from './defaults';

export type SerializeResult =
  | { ok: true; data: FormSchemaData }
  | { ok: false; issues: SchemaIssue[] };

/** Satu opsi per baris → string[] (trim, buang kosong/duplikat). */
export function parseOptionsTextarea(raw: string): string[] {
  return [...new Set(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  )];
}

export function optionsToTextarea(options: string[]): string {
  return options.join('\n');
}

function questionDraftToSchema(d: Extract<BlockDraft, { type: 'question' }>){
  const base: Record<string, unknown> = {
    id: d.id,
    type: 'question',
    kind: d.kind,
    label: d.label,
    required: d.required,
  };
  if (d.kind === 'scale') {
    base.min = d.min ?? 1;
    base.max = d.max ?? 5;
  } else if (
    d.kind === 'single_choice' ||
    d.kind === 'multiple_choice' ||
    d.kind === 'dropdown'
  ) {
    base.options = parseOptionsTextarea(optionsToTextarea(d.options));
  } else if ((d.kind === 'short_text' || d.kind === 'paragraph') && d.maxLength != null) {
    base.maxLength = d.maxLength;
  }
  return base;
}

function blockDraftToSchema(d: BlockDraft): Record<string, unknown> | null {
  switch (d.type) {
    case 'heading':
      return { id: d.id, type: 'heading', text: d.text, size: d.size, align: d.align };
    case 'text':
      return { id: d.id, type: 'text', text: d.text };
    case 'image':
      // publicId masih kosong = blok sedang dikerjakan → ditunda dari payload
      // (bukan membiarkan seluruh draft gagal valid). Panel menandainya.
      return d.publicId.trim() === ''
        ? null
        : { id: d.id, type: 'image', publicId: d.publicId.trim(), align: d.align };
    case 'divider':
      return { id: d.id, type: 'divider' };
    case 'question':
      return questionDraftToSchema(d);
  }
}

function themeDraftToSchema(t: ThemeDraft): Record<string, unknown> {
  return {
    bg: t.bg,
    accent: t.accent,
    text: t.text,
    font: t.font,
    radius: Math.round(t.radius),
    cardStyle: t.cardStyle,
    bannerPublicId: t.bannerPublicId && t.bannerPublicId !== '' ? t.bannerPublicId : null,
  };
}

/** Draft apa adanya → payload kontrak (belum tahu valid/tidak). */
export function toPayload(state: BuilderState): unknown {
  return {
    schemaVersion: FORM_SCHEMA_VERSION,
    theme: themeDraftToSchema(state.theme),
    blocks: state.blocks
      .map(blockDraftToSchema)
      .filter((b): b is Record<string, unknown> => b !== null),
  };
}

/** Payload + validasi sejati; hasil data yang sudah ternormalisasi (default diisi). */
export function serialize(state: BuilderState): SerializeResult {
  const result = parseFormSchema(toPayload(state));
  if (result.ok) return { ok: true, data: result.data };
  return { ok: false, issues: result.issues };
}
