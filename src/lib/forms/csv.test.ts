import { describe, expect, it } from 'vitest';
import { answerToText, buildCsv, csvCell, csvFilename } from './csv';

describe('csvCell — guard CSV injection (T-53/T-54)', () => {
  it('sel biasa dibungkus kutip', () => {
    expect(csvCell('hai')).toBe('"hai"');
  });

  it('kutip di-dobel', () => {
    expect(csvCell('dia bilang "hi"')).toBe('"dia bilang ""hi"""');
  });

  it('awalan formulas/receh ditandai apostrof — Excel tak eksekusi', () => {
    expect(csvCell('=CMD("x")')).toBe('"\'=CMD(""x"")"');
    expect(csvCell('+1+1')).toBe('"\'+1+1"');
    expect(csvCell('-1')).toBe('"\'-1"');
    expect(csvCell('@import')).toBe('"\'@import"');
    expect(csvCell('\tfoo')).toBe('"\'\tfoo"');
    expect(csvCell('\rfoo')).toBe('"\'\rfoo"');
  });

  it('karakter aman yang miris tidak ditandai', () => {
    expect(csvCell('nomor 1 - depan teks')).toBe('"nomor 1 - depan teks"');
  });
});

describe('answerToText', () => {
  it('array digabung ; undefined kosong', () => {
    expect(answerToText(['a', 'b'])).toBe('a; b');
    expect(answerToText(undefined)).toBe('');
  });
});

describe('buildCsv', () => {
  const schema = {
    schemaVersion: 1 as const,
    theme: {
      bg: '#ffffff', accent: '#000000', text: '#111111', font: 'system-ui' as const,
      radius: 8, cardStyle: 'plain' as const, bannerPublicId: null,
    },
    blocks: [
      { id: 'q1', type: 'question' as const, kind: 'short_text' as const, label: 'Nama', required: true },
      { id: 'q2', type: 'question' as const, kind: 'multiple_choice' as const, label: '=Pilih risiko', required: false, options: ['a', 'b'] },
    ],
  };

  it('header = waktu + label pertanyaan; jawaban urut schema', () => {
    const csv = buildCsv(schema as never, [
      { createdAt: '2026-10-22T01:02:03Z', answers: { q1: 'X', q2: ['a', 'b'] } },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('"waktu","Nama","\'=Pilih risiko"');
    expect(lines[1]).toBe('"2026-10-22T01:02:03Z","X","a; b"');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('jawaban hilang → kedua-sel kosong', () => {
    const csv = buildCsv(schema as never, [{ createdAt: 't', answers: {} }]);
    expect(csv).toContain('"t","",""');
  });
});

describe('csvFilename', () => {
  it('slug dibersihkan + tanggal; karakter liar dibuang', () => {
    expect(csvFilename('survei_kelas?x', new Date('2026-10-22T03:00:00Z'))).toBe('surveikelasx-2026-10-22.csv');
    expect(csvFilename('///', new Date('2026-10-22T03:00:00Z'))).toBe('form-2026-10-22.csv');
  });
  it('slug kosong → fallback form', () => {
    expect(csvFilename('').startsWith('form-')).toBe(true);
  });
});
