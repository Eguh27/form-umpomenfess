/**
 * Unit test validator schema form — TUGAS T-21 (Agent C).
 * Cakupan TASK 9 WS-C: nilai di luar whitelist ditolak, ID duplikat ditolak,
 * batas jumlah blok/pertanyaan, peraturan per-kind, dan validasi jawaban.
 */
import { describe, expect, it } from 'vitest';
import { LIMITS } from '../config/limits';
import {
  FORM_SCHEMA_VERSION,
  parseFormSchema,
  validateAnswers,
  type QuestionBlock,
} from './schema';

// ---------------------------------------------------------------------------
// Helper: pembentuk payload
// ---------------------------------------------------------------------------

const theme = {
  bg: '#fdf2f8',
  accent: '#ec4899',
  text: '#1f2937',
  font: 'Poppins',
  radius: 16,
  cardStyle: 'menfess',
} as const;

const heading = (id = 'b1', text = 'Judul') => ({ id, type: 'heading', text });
const divider = (id = 'b2') => ({ id, type: 'divider' });

const question = (id: string, overlay: Partial<QuestionBlock> = {}) => ({
  id,
  type: 'question' as const,
  kind: 'short_text' as const,
  label: 'Pertanyaan',
  required: false as const,
  ...overlay,
});

const choice = (id: string, kind: 'single_choice' | 'multiple_choice' | 'dropdown', options = ['a', 'b']) =>
  question(id, { kind, options });

const scale = (id: string, min = 1, max = 5) => question(id, { kind: 'scale', min, max });

const form = (blocks: unknown[], themeOverride: Record<string, unknown> = {}) =>
  ({
    schemaVersion: FORM_SCHEMA_VERSION,
    theme: { ...theme, ...themeOverride },
    blocks,
  }) as Record<string, unknown>;

/** unique-ish question blocks sejumlah n (untuk uji batas). */
const manyQuestions = (n: number) =>
  Array.from({ length: n }, (_, i) => question(`q${i}`));

// ---------------------------------------------------------------------------
// parseFormSchema
// ---------------------------------------------------------------------------

describe('parseFormSchema — contoh kontrak TASK 4.5', () => {
  it('menerima contoh schema lengkap di TASK.md dan menerapkan default', () => {
    const result = parseFormSchema(
      form([
        { id: 'b1', type: 'heading', text: 'Survei Skripsi', size: 'xl', align: 'center' },
        { id: 'b2', type: 'text', text: 'Mohon bantuannya ya!' },
        { id: 'b3', type: 'image', publicId: 'form/abc' },
        { id: 'b4', type: 'divider' },
        question('q1', { label: 'Nama panggilan', required: true }),
        question('q2', { kind: 'single_choice', label: 'Usia', options: ['<20', '20-25', '>25'] }),
        scale('q3', 1, 5),
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.theme.bannerPublicId).toBeNull();
    expect(result.data.blocks[0]).toMatchObject({ size: 'xl', align: 'center' });
    expect(result.data.blocks[2]).toMatchObject({ align: 'center' }); // default image
  });

  it('menerima blocks kosong (draft belum diisi)', () => {
    expect(parseFormSchema(form([])).ok).toBe(true);
  });
});

describe('parseFormSchema — whitelist & bentuk nilai (ditolak, bukan dibersihkan)', () => {
  const rejects = (payload: unknown, fragment?: string) => {
    const result = parseFormSchema(payload);
    expect(result.ok).toBe(false);
    if (fragment && !result.ok) {
      expect(result.issues.some((issue) => issue.message.includes(fragment))).toBe(true);
    }
  };

  it('schemaVersion selain 1 ditolak', () => {
    rejects({ schemaVersion: 2, theme, blocks: [] });
  });

  it('kunci tidak dikenal di root ditolak', () => {
    rejects({ ...form([]), injection: '<script>' });
  });

  it('kunci tidak dikenal di theme dan blok ditolak', () => {
    rejects(form([], { marquee: true }));
    rejects(form([{ ...heading(), onerror: 'x' }]));
  });

  it('font di luar whitelist ditolak', () => {
    rejects(form([], { font: 'Comic Sans' }));
  });

  it('cardStyle di luar preset ditolak', () => {
    rejects(form([], { cardStyle: 'glassmorphism' }));
  });

  it('warna bukan hex (bukan #rrggbb 6 digit) ditolak', () => {
    rejects(form([], { bg: 'merah' }));
    rejects(form([], { bg: '#abc' }));
    rejects(form([], { text: '#1f293' }));
  });

  it('radius di luar rentang / bukan bilangan bulat ditolak', () => {
    rejects(form([], { radius: 60 }));
    rejects(form([], { radius: -1 }));
    rejects(form([], { radius: 16.5 }));
  });

  it('bannerPublicId dengan bentuk URL bebas ditolak (bukan publicId Cloudinary)', () => {
    rejects(form([], { bannerPublicId: 'https://evil.example/track.png' }));
    rejects(form([], { bannerPublicId: '' }));
  });

  it('id blok dengan karakter aneh / terlalu panjang ditolak', () => {
    rejects(form([{ id: 'bad id!', type: 'divider' }]));
    rejects(form([{ id: 'x'.repeat(64), type: 'divider' }]));
    rejects(form([{ id: 21 as unknown as string, type: 'divider' }]));
  });
});

describe('parseFormSchema — peraturan per-kind', () => {
  it('single_choice/dropdown tanpa options ditolak', () => {
    expect(parseFormSchema(form([question('q1', { kind: 'single_choice' })])).ok).toBe(false);
    expect(parseFormSchema(form([question('q1', { kind: 'dropdown' })])).ok).toBe(false);
  });

  it('options dengan opsi duplikat / kosong / terlalu banyak ditolak', () => {
    const result = parseFormSchema(form([choice('q1', 'multiple_choice', ['a', 'a'])]));
    expect(result.ok).toBe(false);

    const empty = parseFormSchema(form([choice('q1', 'single_choice', ['a', ''])]));
    expect(empty.ok).toBe(false);

    const tooMany = parseFormSchema(
      form([choice('q1', 'dropdown', Array.from({ length: 27 }, () => 'x'))]),
    );
    expect(tooMany.ok).toBe(false);
  });

  it('scale tanpa min/max atau max <= min ditolak', () => {
    expect(parseFormSchema(form([question('q1', { kind: 'scale' })])).ok).toBe(false);
    expect(parseFormSchema(form([scale('q1', 5, 5)])).ok).toBe(false);
    expect(parseFormSchema(form([scale('q1', 2, 1)])).ok).toBe(false);
  });

  it('field di luar kind ditolak (bukan diabaikan)', () => {
    expect(parseFormSchema(form([question('q1', { options: ['x'] })])).ok).toBe(false);
    expect(parseFormSchema(form([question('q1', { min: 1 })])).ok).toBe(false);
    // options tidak berlaku untuk scale; maxLength hanya untuk short_text/paragraph
    expect(
      parseFormSchema(form([question('q1', { kind: 'scale', min: 1, max: 5, options: ['x'] })])).ok,
    ).toBe(false);
    expect(parseFormSchema(form([question('q1', { kind: 'paragraph', maxLength: 10 })])).ok).toBe(true);
    expect(parseFormSchema(form([question('q1', { kind: 'scale', min: 1, max: 5, maxLength: 10 })])).ok).toBe(false);
  });
});

describe('parseFormSchema — batas & integritas', () => {
  it('id duplikat ditolak dengan path blok yang salah', () => {
    const result = parseFormSchema(form([heading('dup'), divider('dup')]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === 'blocks.1' && issue.message.includes('dup'))).toBe(true);
    }
  });

  it(`lebih dari ${LIMITS.maxBlocksPerForm} blok ditolak`, () => {
    const blocks = Array.from({ length: LIMITS.maxBlocksPerForm + 1 }, (_, i) => divider(`d${i}`));
    expect(parseFormSchema(form(blocks)).ok).toBe(false);
  });

  it(`tidak apa-apa tepat ${LIMITS.maxBlocksPerForm} blok`, () => {
    const blocks = Array.from({ length: LIMITS.maxBlocksPerForm }, (_, i) => divider(`d${i}`));
    expect(parseFormSchema(form(blocks)).ok).toBe(true);
  });

  it(`lebih dari ${LIMITS.maxQuestionsPerForm} pertanyaan ditolak`, () => {
    const result = parseFormSchema(form(manyQuestions(LIMITS.maxQuestionsPerForm + 1)));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.message.includes('pertanyaan'))).toBe(true);
    }
  });

  it('label kosong/terlalu panjang ditolak', () => {
    expect(parseFormSchema(form([question('q1', { label: '' })])).ok).toBe(false);
    expect(parseFormSchema(form([question('q1', { label: 'x'.repeat(301) })])).ok).toBe(false);
  });

  it('payload bukan object ditolak', () => {
    expect(parseFormSchema(null).ok).toBe(false);
    expect(parseFormSchema([form([])]).ok).toBe(false);
    expect(parseFormSchema('{"schemaVersion":1}').ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateAnswers
// ---------------------------------------------------------------------------

const sampleForm = () => {
  const parsed = parseFormSchema(
    form([
      question('q_text', { label: 'Nama', required: true, maxLength: 10 }),
      question('q_para', { kind: 'paragraph', label: 'Cerita' }),
      choice('q_single', 'single_choice', ['A', 'B']),
      choice('q_multi', 'multiple_choice', ['X', 'Y', 'Z']),
      scale('q_scale', 1, 5),
    ]),
  );
  if (!parsed.ok) throw new Error('sampleForm() harus valid');
  return parsed.data;
};

describe('validateAnswers — alur normal', () => {
  it('menerima jawaban valid dan membuang jawaban kosong pada pertanyaan opsional', () => {
    const form = sampleForm();
    const result = validateAnswers(form, {
      q_text: 'Alya',
      q_single: 'B',
      q_multi: ['X', 'Z'],
      q_scale: 4,
      q_para: '   ', // opsional kosong → dianggap tidak menjawab
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      q_text: 'Alya',
      q_single: 'B',
      q_multi: ['X', 'Z'],
      q_scale: 4,
    });
  });

  it('menerima form yang hanya menjawab pertanyaan yang wajib', () => {
    const result = validateAnswers(sampleForm(), { q_text: 'Budi' });
    expect(result.ok).toBe(true);
  });
});

describe('validateAnswers — kasus nakal', () => {
  it('menolak array / string / null sebagai payload jawaban', () => {
    const form = sampleForm();
    for (const bad of [[], 'x', null, 42]) {
      const result = validateAnswers(form, bad);
      expect(result.ok).toBe(false);
    }
  });

  it('menolak id pertanyaan yang tidak ada di schema', () => {
    const result = validateAnswers(sampleForm(), { q_text: 'Budi', q_hack: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.find((issue) => issue.questionId === 'q_hack')?.message).toContain('dikenal');
    }
  });

  it('menolak bila pertanyaan wajib tidak dijawab/kosong', () => {
    expect(validateAnswers(sampleForm(), {}).ok).toBe(false);
    expect(validateAnswers(sampleForm(), { q_text: '   ' }).ok).toBe(false);
  });

  it('menolak jawaban pilihan di luar options', () => {
    const result = validateAnswers(sampleForm(), { q_text: 'Budi', q_single: 'C' });
    expect(result.ok).toBe(false);
  });

  it('menolak multiple_choice berisi opsi palsu, duplikat, atau bukan array', () => {
    const form = sampleForm();
    expect(validateAnswers(form, { q_text: 'B', q_multi: ['X', 'X'] }).ok).toBe(false);
    expect(validateAnswers(form, { q_text: 'B', q_multi: ['X', 'HACK'] }).ok).toBe(false);
    expect(validateAnswers(form, { q_text: 'B', q_multi: 'X' }).ok).toBe(false);
  });

  it('menolak skala non-bilangan / non-bilangan bulat / di luar rentang', () => {
    const base = { q_text: 'Budi' } as Record<string, unknown>;
    expect(validateAnswers(sampleForm(), { ...base, q_scale: '5' }).ok).toBe(false);
    expect(validateAnswers(sampleForm(), { ...base, q_scale: 4.5 }).ok).toBe(false);
    expect(validateAnswers(sampleForm(), { ...base, q_scale: 0 }).ok).toBe(false);
    expect(validateAnswers(sampleForm(), { ...base, q_scale: 6 }).ok).toBe(false);
  });

  it('menolak jawaban teks melebihi maxLength pertanyaan (kontras dengan limit global)', () => {
    const form = sampleForm();
    expect(validateAnswers(form, { q_text: 'x'.repeat(11) }).ok).toBe(false);
    // paragraph tanpa maxLength masih terikat limit global
    expect(
      validateAnswers(form, { q_text: 'ok', q_para: 'y'.repeat(LIMITS.maxTextAnswerLength + 1) }).ok,
    ).toBe(false);
  });
});
