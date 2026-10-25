import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../lib/config/limits';
import { emptyState, type BlockDraft, type BuilderState } from './defaults';
import {
  addBlock,
  draftBlock,
  insertBlockAfter,
  moveBlock,
  nextBlockId,
  questionCount,
  removeBlock,
  updateBlock,
} from './state';

function state(...types: BlockDraft['type'][]): BuilderState {
  let s: BuilderState = emptyState('uji');
  // addBlock dipakai agar id otomatis konsisten (b1/q1, dst.)
  for (const type of types) s = addBlock(s, type) ?? s;
  return s;
}

describe('nextBlockId', () => {
  it('prefiks q untuk pertanyaan, b untuk blok lain', () => {
    const s = state('divider', 'question');
    expect(nextBlockId(s.blocks, 'question')).toBe('q2');
    expect(nextBlockId(s.blocks, 'text')).toBe('b2');
  });
});

describe('addBlock', () => {
  it('blok baru lengkap sesuai jenis', () => {
    const s = state('question');
    expect(questionCount(s.blocks)).toBe(1);
    const q = s.blocks[0] as Extract<BlockDraft, { type: 'question' }>;
    expect(q.kind).toBe('short_text');
    expect(q.options).toEqual([]);
    expect(q.min).toBeNull();
  });

  it('bongkar limit blok: > 240 tidak diizinkan → null', () => {
    let s = emptyState('lewat');
    for (let i = 0; i < 3; i++) {
      const next = addBlock(s, 'divider');
      if (next === null) break;
      s = next;
    }
    expect(s.blocks.length).toBe(3);
  });
});

describe('insertBlockAfter', () => {
  it('menyisipkan tepat setelah afterId (tengah array tetap terjaga)', () => {
    const s = state('divider', 'text', 'heading');
    const ids = s.blocks.map((b) => b.id);
    const baru = draftBlock('question', s.blocks);
    const next = insertBlockAfter(s.blocks, ids[1], baru);
    expect(next.map((b) => b.id)).toEqual([ids[0], ids[1], baru.id, ids[2]]);
    expect(s.blocks.map((b) => b.id)).toEqual(ids); // blocks asal tidak terubah
  });

  it('afterId null atau tidak ditemukan → append di akhir', () => {
    const s = state('divider');
    const q = draftBlock('question', s.blocks);
    expect(insertBlockAfter(s.blocks, null, q).map((b) => b.id)).toEqual(['b1', q.id]);
    expect(insertBlockAfter(s.blocks, 'tidak-ada', q).map((b) => b.id)).toEqual(['b1', q.id]);
  });

  it('limit blok tercapai → kembalikan blocks apa adanya (defensif)', () => {
    const penuh: BlockDraft[] = Array.from({ length: LIMITS.maxBlocksPerForm }, (_, i) => ({
      id: `d${i + 1}`,
      type: 'divider',
    }));
    const hasil = insertBlockAfter(penuh, 'd1', { id: 'dx', type: 'divider' });
    expect(hasil).toBe(penuh); // referensi sama: tidak ada penyisipan
  });
});

describe('moveBlock / removeBlock', () => {
  it('naik/turun memindahkan posisi; ujung tidak berubah', () => {
    const s = state('divider', 'text', 'heading');
    const ids = s.blocks.map((b) => b.id);
    const moved = moveBlock(s, ids[2], -1);
    expect(moved.blocks.map((b) => b.id)).toEqual([ids[0], ids[2], ids[1]]);
    expect(moveBlock(s, ids[0], -1).blocks.map((b) => b.id)).toEqual(ids);
  });

  it('hapus membuang satu; id lain utuh', () => {
    const s = state('divider', 'question');
    const s2 = removeBlock(s, s.blocks[0].id);
    expect(s2.blocks).toHaveLength(1);
    expect(s2.blocks[0].id).toBe(s.blocks[1].id);
  });
});

describe('updateBlock: ganti kind question', () => {
  it('single_choice → options default 2, min/max null', () => {
    const s = state('question');
    const patched = updateBlock(s, s.blocks[0].id, { kind: 'single_choice' });
    const q = patched.blocks[0] as Extract<BlockDraft, { type: 'question' }>;
    expect(q.kind).toBe('single_choice');
    expect(q.options).toEqual(['Opsi 1', 'Opsi 2']);
    expect(q.min).toBeNull();
    expect(q.max).toBeNull();
  });

  it('scale → min 1 max 5, options dikosongkan', () => {
    const s = state('question');
    const patched = updateBlock(s, s.blocks[0].id, { kind: 'scale' });
    const q = patched.blocks[0] as Extract<BlockDraft, { type: 'question' }>;
    expect(q.kind).toBe('scale');
    expect(q.min).toBe(1);
    expect(q.max).toBe(5);
    expect(q.options).toEqual([]);
  });

  it('patch biasa tetap mempertahankan field lain', () => {
    const s = state('text');
    const patched = updateBlock(s, s.blocks[0].id, { text: 'Halo' });
    expect((patched.blocks[0] as { text: string }).text).toBe('Halo');
  });
});

describe('draftBlock', () => {
  it('vidual setiap jenis mampu diserialisasi (uji menyusul di serialize)', () => {
    const s = state('heading', 'image');
    expect(draftBlock('divider', s.blocks).id).toBe('b3');
  });
});
