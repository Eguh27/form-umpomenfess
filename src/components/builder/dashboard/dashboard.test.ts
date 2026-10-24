import { describe, expect, it } from 'vitest';
import { extractSampleQuestions, calculateProgress } from './templateHelper';
import { STATUS_LABELS } from './types';
import { TITLE_SUGGESTIONS } from './DashboardCreateModal';
import { PREBUILT_TEMPLATES } from '../defaultTemplates';

describe('extractSampleQuestions', () => {
  it('mengekstrak pertanyaan dari array blocks dan mengubah jenis pertanyaan ke teks ramah', () => {
    const blocks = [
      { id: 'h1', type: 'heading', text: 'Judul Survei' },
      { id: 'q1', type: 'question', kind: 'short_text', label: 'Nama Lengkap' },
      { id: 'q2', type: 'question', kind: 'scale', label: 'Kepuasan Layanan', min: 1, max: 5 },
      { id: 'q3', type: 'question', kind: 'single_choice', label: 'Program Studi', options: ['TI', 'SI', 'MI'] },
      { id: 'd1', type: 'divider' },
      { id: 'q4', type: 'question', kind: 'paragraph', label: 'Saran Tambahan' },
      { id: 'q5', type: 'question', kind: 'dropdown', label: 'Fakultas', options: ['Teknik', 'Ekonomi'] },
    ];

    const samples = extractSampleQuestions(blocks, 4);
    expect(samples).toHaveLength(4);
    expect(samples[0]).toEqual({ label: 'Nama Lengkap', kindText: 'Teks Singkat' });
    expect(samples[1]).toEqual({ label: 'Kepuasan Layanan', kindText: 'Skala Nilai 1-5' });
    expect(samples[2]).toEqual({ label: 'Program Studi', kindText: 'Pilihan Tunggal (Radio) (3 opsi)' });
    expect(samples[3]).toEqual({ label: 'Saran Tambahan', kindText: 'Teks Panjang / Uraian' });
  });

  it('mengembalikan array kosong jika blocks bukan array atau bernilai null/undefined', () => {
    expect(extractSampleQuestions([])).toEqual([]);
    expect(extractSampleQuestions(null as unknown as unknown[])).toEqual([]);
    expect(extractSampleQuestions(undefined as unknown as unknown[])).toEqual([]);
    expect(extractSampleQuestions('string' as unknown as unknown[])).toEqual([]);
  });

  it('menangani jenis skala dengan min dan max khusus (mis. 1-10)', () => {
    const blocks = [
      { id: 'q_nps', type: 'question', kind: 'scale', label: 'Rekomendasi (NPS)', min: 1, max: 10 },
    ];
    const samples = extractSampleQuestions(blocks);
    expect(samples).toHaveLength(1);
    expect(samples[0].kindText).toBe('Skala Nilai 1-10');
  });

  it('menangani blok pertanyaan tanpa label atau kind asing secara aman tanpa crash', () => {
    const blocks = [
      { id: 'q1', type: 'question', kind: 'custom_type', label: '' },
    ];
    const samples = extractSampleQuestions(blocks);
    expect(samples).toHaveLength(1);
    expect(samples[0].label).toBe('Pertanyaan tanpa judul');
    expect(samples[0].kindText).toBe('Pertanyaan');
  });

  it('setiap template di PREBUILT_TEMPLATES menghasilkan contoh pertanyaan nyata yang informatif', () => {
    for (const tpl of PREBUILT_TEMPLATES) {
      const samples = extractSampleQuestions(tpl.schema.blocks);
      expect(samples.length).toBeGreaterThan(0);
      for (const s of samples) {
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.kindText.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('calculateProgress', () => {
  it('menghitung rasio dan label kuota saat maxResponses ditentukan', () => {
    const result = calculateProgress(25, 100);
    expect(result.hasQuota).toBe(true);
    expect(result.ratio).toBe(25);
    expect(result.label).toBe('25 / 100 kuota terisi (25%)');
  });

  it('membatasi rasio maksimum hingga 100% jika respons melebihi kuota', () => {
    const result = calculateProgress(120, 100);
    expect(result.hasQuota).toBe(true);
    expect(result.ratio).toBe(100);
    expect(result.label).toBe('120 / 100 kuota terisi (100%)');
  });

  it('tidak menampilkan progress bar palsu saat maxResponses null/undefined (tanpa batas)', () => {
    const resultNull = calculateProgress(42, null);
    expect(resultNull.hasQuota).toBe(false);
    expect(resultNull.ratio).toBe(0);
    expect(resultNull.label).toBe('42 jawaban masuk · Tanpa batas kuota');

    const resultZero = calculateProgress(0, null);
    expect(resultZero.hasQuota).toBe(false);
    expect(resultZero.ratio).toBe(0);
    expect(resultZero.label).toBe('0 jawaban masuk · Tanpa batas kuota');
  });

  it('menangani nilai negatif atau respons tidak terdefinisi secara aman', () => {
    const result = calculateProgress(-5, null);
    expect(result.hasQuota).toBe(false);
    expect(result.ratio).toBe(0);
    expect(result.label).toBe('0 jawaban masuk · Tanpa batas kuota');
  });
});

describe('STATUS_LABELS', () => {
  it('menyediakan status ramah untuk published, draft, dan closed', () => {
    expect(STATUS_LABELS.published).toBeDefined();
    expect(STATUS_LABELS.published.label).toContain('🟢');
    expect(STATUS_LABELS.published.desc).toContain('aktif');

    expect(STATUS_LABELS.draft).toBeDefined();
    expect(STATUS_LABELS.draft.label).toContain('🟡');

    expect(STATUS_LABELS.closed).toBeDefined();
    expect(STATUS_LABELS.closed.label).toContain('⚪');
  });
});

describe('TITLE_SUGGESTIONS', () => {
  it('memiliki judul bersih tanpa emoji di teks utama judul', () => {
    for (const sug of TITLE_SUGGESTIONS) {
      expect(sug.title).not.toMatch(/^[\u{1F300}-\u{1F9FF}]/u);
      expect(sug.title.length).toBeGreaterThan(5);
      expect(sug.icon.length).toBeGreaterThan(0);
      expect(sug.category.length).toBeGreaterThan(0);
    }
  });
});
