import { describe, expect, it } from 'vitest';
import { summarizeAnswers } from './summary';
import type { FormAnswerValue } from './schema';

const schema = {
  schemaVersion: 1 as const,
  theme: {
    bg: '#ffffff', accent: '#000000', text: '#111111', font: 'system-ui' as const,
    radius: 8, cardStyle: 'plain' as const, bannerPublicId: null,
  },
  blocks: [
    { id: 'q1', type: 'question' as const, kind: 'short_text' as const, label: 'Nama', required: true },
    { id: 'q2', type: 'question' as const, kind: 'single_choice' as const, label: 'Suka', required: false, options: ['ya', 'tidak'] },
    { id: 'q3', type: 'question' as const, kind: 'scale' as const, label: 'Nilai', required: false, min: 1, max: 3 },
  ],
} as const;

describe('summarizeAnswers (T-53/T-54)', () => {
  it('opsi schema tetap tampil walau 0; jawaban luar opsi ikut', () => {
    const summaries = summarizeAnswers(schema as never, [
      { q2: 'ya' },
      { q2: 'aneh' },
      { q2: 'ya' },
    ]);
    const q2 = summaries.find((s) => s.id === 'q2')!;
    expect(q2.answered).toBe(3);
    expect(q2.options).toEqual([
      { option: 'ya', count: 2 },
      { option: 'tidak', count: 0 },
      { option: 'aneh', count: 1 },
    ]);
  });

  it('multiple: array dihitung per item', () => {
    const summaries = summarizeAnswers(schema as never, [
      { q2: ['ya', 'tidak'] },
      { q2: ['ya'] },
      {} as Record<string, FormAnswerValue>,
    ]);
    const q2 = summaries.find((s) => s.id === 'q2')!;
    expect(q2.answered).toBe(2);
    expect(q2.options!.find((o) => o.option === 'ya')!.count).toBe(2);
    expect(q2.options!.find((o) => o.option === 'tidak')!.count).toBe(1);
  });

  it('scale: average + histogram dalam rentang', () => {
    const summaries = summarizeAnswers(schema as never, [
      { q3: 3 },
      { q3: 1 },
      { q3: 3 },
    ]);
    const q3 = summaries.find((s) => s.id === 'q3')!;
    expect(q3.average).toBeCloseTo(2.333, 2);
    expect(q3.histogram).toEqual([
      { value: 1, count: 1 },
      { value: 2, count: 0 },
      { value: 3, count: 2 },
    ]);
  });

  it('teks: hanya hitung; kosong semua tetap 0', () => {
    const summaries = summarizeAnswers(schema as never, [{ q1: 'Rina' }, {}]);
    expect(summaries.find((s) => s.id === 'q1')!.answered).toBe(1);
  });
});
