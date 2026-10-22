/**
 * state.ts — operasi murni state builder (T-41). Tanpa React, tanpa DOM:
 * Editor.tsx tinggal memakai; semua diuji di state.test.ts.
 */
import { LIMITS } from '../../lib/config/limits';
import type { BlockDraft, BuilderState } from './defaults';

export const QUESTION_TYPE_PLACEHOLDER: Record<string, string> = {
  short_text: 'Jawaban singkat',
  paragraph: 'Jawaban panjang',
  single_choice: 'Pilih satu',
  multiple_choice: 'Pilih beberapa',
  dropdown: 'Pilih dari daftar',
  scale: 'Skala 1–5',
};

function counterKey(type: BlockDraft['type']): 'b' | 'q' {
  return type === 'question' ? 'q' : 'b';
}

/** id baru unik: b1, b2, ..., q1, q2, ... (ruang id dipakai bersama per prefiks). */
export function nextBlockId(blocks: BlockDraft[], type: BlockDraft['type']): string {
  const prefix = counterKey(type);
  let max = 0;
  for (const b of blocks) {
    if (!b.id.startsWith(prefix)) continue;
    const n = parseInt(b.id.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function questionCount(blocks: BlockDraft[]): number {
  return blocks.filter((b) => b.type === 'question').length;
}

/** Blok default per jenis (draft); id dari nextBlockId. */
export function draftBlock(type: BlockDraft['type'], blocks: BlockDraft[]): BlockDraft {
  const id = nextBlockId(blocks, type);
  switch (type) {
    case 'heading':
      return { id, type: 'heading', text: 'Judul bagian', size: 'm', align: 'left' };
    case 'text':
      return { id, type: 'text', text: 'Teks penjelas…' };
    case 'image':
      return { id, type: 'image', publicId: '', align: 'center' };
    case 'divider':
      return { id, type: 'divider' };
    case 'question': {
      return {
        id,
        type: 'question',
        kind: 'short_text',
        label: 'Pertanyaan baru',
        required: false,
        options: [],
        min: null,
        max: null,
        maxLength: null,
      };
    }
  }
}

/** Tambah blok; null jika melampaui limit (blok/pertanyaan). */
export function addBlock(state: BuilderState, type: BlockDraft['type']): BuilderState | null {
  if (state.blocks.length >= LIMITS.maxBlocksPerForm) return null;
  if (type === 'question' && questionCount(state.blocks) >= LIMITS.maxQuestionsPerForm) return null;
  return { ...state, blocks: [...state.blocks, draftBlock(type, state.blocks)] };
}

export function removeBlock(state: BuilderState, id: string): BuilderState {
  return { ...state, blocks: state.blocks.filter((b) => b.id !== id) };
}

/** Pindahkan blok ±1 posisi (tombol naik/turun — drag&drop menyusul, TASK 2). */
export function moveBlock(state: BuilderState, id: string, delta: -1 | 1): BuilderState {
  const idx = state.blocks.findIndex((b) => b.id === id);
  const target = idx + delta;
  if (idx === -1 || target < 0 || target >= state.blocks.length) return state;
  const blocks = [...state.blocks];
  const [moved] = blocks.splice(idx, 1);
  blocks.splice(target, 0, moved);
  return { ...state, blocks };
}

/** Patch satu blok; reset field spesifik saat kind question berganti. */
export function updateBlock(
  state: BuilderState,
  id: string,
  patch: Partial<BlockDraft>,
): BuilderState {
  return {
    ...state,
    blocks: state.blocks.map((b) => {
      if (b.id !== id) return b;
      let kind = (patch as { kind?: unknown }).kind;
      kind = typeof kind === 'string' ? kind : undefined;
      if (b.type === 'question' && patch.type === undefined && typeof kind === 'string') {
        if (kind === 'scale') {
          return { ...b, kind, options: [], min: 1, max: 5 };
        }
        if (kind === 'single_choice' || kind === 'multiple_choice' || kind === 'dropdown') {
          return { ...b, kind, options: ['Opsi 1', 'Opsi 2'], min: null, max: null };
        }
        return { ...b, kind, options: [], min: null, max: null };
      }
      return { ...b, ...patch } as BlockDraft;
    }),
  };
}
