import { describe, expect, it } from 'vitest';
import { emptyState, type BuilderState } from './defaults';
import { addBlock, updateBlock } from './state';
import { optionsToTextarea, parseOptionsTextarea, serialize, toPayload } from './serialize';
import { FORM_SCHEMA_VERSION } from '../../lib/forms/schema';

/** State lengkap: semua jenis blok + semua kind pertanyaan terwakili. */
function fullState(): BuilderState {
  let s = emptyState('Survei lengkap');
  const add = (s0: BuilderState, type: Parameters<typeof addBlock>[1]) => addBlock(s0, type) ?? s0;
  s = add(s, 'heading');
  s = add(s, 'text');
  s = add(s, 'image');
  s = add(s, 'divider');
  s = add(s, 'question'); // short_text
  s = add(s, 'question');
  s = updateBlock(s, s.blocks[s.blocks.length - 1].id, { kind: 'paragraph' });
  s = add(s, 'question');
  s = updateBlock(s, s.blocks[s.blocks.length - 1].id, { kind: 'single_choice' });
  s = add(s, 'question');
  s = updateBlock(s, s.blocks[s.blocks.length - 1].id, { kind: 'multiple_choice' });
  s = add(s, 'question');
  s = updateBlock(s, s.blocks[s.blocks.length - 1].id, { kind: 'dropdown' });
  s = add(s, 'question');
  s = updateBlock(s, s.blocks[s.blocks.length - 1].id, { kind: 'scale' });
  return s;
}

describe('serialize: builder selalu menghasilkan JSON valid (T-44)', () => {
  it('state lengkap (semua jenis blok) lolos parseFormSchema', () => {
    const result = serialize(fullState());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(FORM_SCHEMA_VERSION);
      expect(result.data.blocks).toHaveLength(9);
    }
  });

  it('state kosong juga valid', () => {
    expect(serialize(emptyState()).ok).toBe(true);
  });

  it('skala: min/max hanya dipakai untuk scale; options hanya untuk pilihan', () => {
    const payload = toPayload(fullState()) as { blocks: Array<Record<string, unknown>> };
    const texts = payload.blocks.filter((b) => b.kind === 'short_text');
    expect(texts.some((b) => 'min' in b || 'options' in b)).toBe(false);
    const scales = payload.blocks.filter((b) => b.kind === 'scale');
    expect(scales[0]).toMatchObject({ min: 1, max: 5 });
    const choices = payload.blocks.filter((b) => b.kind === 'single_choice');
    expect(choices[0]).toHaveProperty('options');
  });

  it('blok gambar dengan publicId kosong DITUNDA dari payload — draft tetap valid', () => {
    let s = addBlock(emptyState('x'), 'image')!;
    const result = serialize(s);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.blocks).toHaveLength(0);
    // setelah diisi → ikut
    s = updateBlock(s, s.blocks[0].id ?? 'b1', { publicId: 'form/abc1' });
    const withImage = serialize(s);
    expect(withImage.ok).toBe(true);
    if (withImage.ok) expect(withImage.data.blocks).toHaveLength(1);
  });

  it('teks user tersimpan sebagai string apa adanya — TIDAK diHTML-sanitasi di sini (rendering yang escape)', () => {
    let s = addBlock(emptyState('x'), 'heading')!;
    const id = s.blocks[0].id;
    s = updateBlock(s, id, { text: '<script>alert(1)</script>' });
    const result = serialize(s);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const block = result.data.blocks[0];
      if (block.type === 'heading') expect(block.text).toBe('<script>alert(1)</script>');
    }
  });

  it('draft invalid (radius 999 → dibatasi) → issues, bukan throw', () => {
    const s = { ...emptyState('bad'), theme: { ...emptyState().theme, radius: 999 } };
    const result = serialize(s);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe('optionsTextarea', () => {
  it('baris → opsi; kosong & duplikat dibuang', () => {
    expect(parseOptionsTextarea('A\nB\n\nA ')).toEqual(['A', 'B']);
    expect(optionsToTextarea(['A', 'B'])).toBe('A\nB');
  });
});
