/**
 * src/lib/forms/schema.ts — SATU SUMBER tipe & validator schema form.
 *
 * Kontrak: TASK.md bagian 4.5 (schema JSON versi 1).
 * - Builder (Agent B) dan halaman publik/API (Agent C) WAJIB mengimpor dari sini.
 * - Semua object pakai z.strictObject: kunci tidak dikenal DITOLAK, bukan dibuang.
 * - Nilai di luar whitelist DITOLAK (bukan dibersihkan diam-diam).
 * - Kontras/whitelist util tampilan milik Agent D (T-32); whitelist font berada di sini.
 */

import { z } from 'zod';
import { LIMITS } from '../config/limits';

/** Versi schema form yang didukung endpoint ini. */
export const FORM_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Whitelist & batas
// ---------------------------------------------------------------------------

/** Font yang boleh dipilih pembuat form (dipakai builder + tema). Naikkan HANYA lewat CONTRACT CHANGE. */
export const FONT_WHITELIST = ['system-ui', 'Quicksand', 'Baloo 2', 'Georgia'] as const;
export type FormFont = (typeof FONT_WHITELIST)[number];

/** Preset gaya kartu (TASK 4.5). */
export const CARD_STYLE_PRESETS = ['menfess', 'plain', 'soft'] as const;
export type CardStyle = (typeof CARD_STYLE_PRESETS)[number];

export const HEADING_SIZES = ['s', 'm', 'l', 'xl'] as const;
export type HeadingSize = (typeof HEADING_SIZES)[number];

export const ALIGNMENTS = ['left', 'center', 'right'] as const;
export type BlockAlign = (typeof ALIGNMENTS)[number];

export const BLOCK_TYPES = ['heading', 'text', 'image', 'divider', 'question'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const QUESTION_KINDS = [
  'short_text', 'paragraph', 'single_choice', 'multiple_choice', 'dropdown', 'scale',
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/** Jenis pertanyaan yang jawabannya berupa pilihan (butuh `options`). */
export const CHOICE_KINDS = ['single_choice', 'multiple_choice', 'dropdown'] as const;
export type ChoiceKind = (typeof CHOICE_KINDS)[number];

/** Batas yang menempel pada schema (limit platform-level ada di ../config/limits). */
export const SCHEMA_LIMITS = {
  idPattern: /^[A-Za-z0-9_-]{1,32}$/,
  maxTextLength: 2000,
  maxHeadingLength: 200,
  maxLabelLength: 300,
  maxOptionLength: 100,
  maxOptions: 26,
  maxPublicIdLength: 200,
  radiusMin: 0,
  radiusMax: 48,
  scaleValueMin: 0,
  scaleValueMax: 10,
  /** rentang maksimum (max - min) pertanyaan skala */
  scaleRangeMax: 20,
  /** format publicId Cloudinary milik project ini (bukan URL bebas — cegah tracking pixel). */
  publicIdPattern: /^[A-Za-z0-9][A-Za-z0-9/_-]{0,199}$/,
} as const;

/** Warna hex #rrggbb (6 digit; builder color picker memang menghasilkan bentuk ini). */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'wajib warna hex #rrggbb (6 digit)');

const blockId = z
  .string()
  .regex(SCHEMA_LIMITS.idPattern, 'id blok wajib 1-32 karakter [A-Za-z0-9_-]');

const publicId = z
  .string()
  .regex(SCHEMA_LIMITS.publicIdPattern, 'publicId wajib format [A-Za-z0-9/_-] tanpa URL');

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export const themeSchema = z.strictObject({
  bg: hexColor,
  accent: hexColor,
  text: hexColor,
  font: z.enum(FONT_WHITELIST),
  radius: z
    .number()
    .int()
    .min(SCHEMA_LIMITS.radiusMin)
    .max(SCHEMA_LIMITS.radiusMax),
  cardStyle: z.enum(CARD_STYLE_PRESETS),
  /** Gambar hanya melalui upload Cloudinary milik project (publicId), null kalau kosong. */
  bannerPublicId: publicId.nullable().default(null),
});

export type FormTheme = z.infer<typeof themeSchema>;

// ---------------------------------------------------------------------------
// Blok
// ---------------------------------------------------------------------------

const headingBlock = z.strictObject({
  id: blockId,
  type: z.literal('heading'),
  text: z.string().min(1, 'teks heading wajib ada').max(SCHEMA_LIMITS.maxHeadingLength),
  size: z.enum(HEADING_SIZES).default('m'),
  align: z.enum(ALIGNMENTS).default('left'),
});

const textBlock = z.strictObject({
  id: blockId,
  type: z.literal('text'),
  text: z.string().min(1, 'teks wajib ada').max(SCHEMA_LIMITS.maxTextLength),
});

const imageBlock = z.strictObject({
  id: blockId,
  type: z.literal('image'),
  publicId,
  align: z.enum(ALIGNMENTS).default('center'),
});

const dividerBlock = z.strictObject({
  id: blockId,
  type: z.literal('divider'),
});

/*
  Question: satu object dengan field opsional per-kind, lalu disaring superRefine
  agar kombinasi kind <-> field selalu valid (field di luar kind DITOLAK).
*/
const questionBlock = z
  .strictObject({
    id: blockId,
    type: z.literal('question'),
    kind: z.enum(QUESTION_KINDS),
    label: z.string().min(1, 'label wajib ada').max(SCHEMA_LIMITS.maxLabelLength),
    required: z.boolean().default(false),
    /** wajib untuk CHOICE_KINDS; ditolak untuk kind lain. */
    options: z
      .array(
        z.string().min(1, 'opsi tidak boleh kosong').max(SCHEMA_LIMITS.maxOptionLength),
      )
      .min(1)
      .max(SCHEMA_LIMITS.maxOptions)
      .optional(),
    /** wajib (dua-duanya) untuk scale; ditolak untuk kind lain. */
    min: z.number().int().min(SCHEMA_LIMITS.scaleValueMin).optional(),
    max: z.number().int().min(1).max(SCHEMA_LIMITS.scaleValueMax).optional(),
    /** batas jawaban teks per pertanyaan (≤ LIMITS.maxTextAnswerLength). */
    maxLength: z.number().int().min(1).max(LIMITS.maxTextAnswerLength).optional(),
  })
  .superRefine((q, ctx) => {
    const addIssue = (message: string, path?: (string | number)[]) => {
      ctx.addIssue({ code: 'custom', message, input: q, path });
    };

    if (q.kind === 'scale') {
      if (q.min === undefined || q.max === undefined) {
        addIssue('skala wajib punya min dan max');
        return;
      }
      if (q.max <= q.min) {
        addIssue('skala max harus lebih besar dari min');
      }
      if (q.max - q.min > SCHEMA_LIMITS.scaleRangeMax) {
        addIssue(`rentang skala maksimum ${SCHEMA_LIMITS.scaleRangeMax}`);
      }
      if (q.options !== undefined) addIssue('options tidak berlaku untuk pertanyaan skala');
      if (q.maxLength !== undefined) addIssue('maxLength tidak berlaku untuk pertanyaan skala');
      return;
    }

    if (q.min !== undefined || q.max !== undefined) {
      addIssue('min/max hanya berlaku untuk pertanyaan skala');
    }
    if (q.maxLength !== undefined && q.kind !== 'short_text' && q.kind !== 'paragraph') {
      addIssue('maxLength hanya berlaku untuk short_text/paragraph');
    }

    if ((CHOICE_KINDS as readonly string[]).includes(q.kind)) {
      if (!q.options) {
        addIssue('options wajib ada untuk pertanyaan pilihan');
        return;
      }
      if (new Set(q.options).size !== q.options.length) {
        addIssue('opsi tidak boleh duplikat', ['options']);
      }
    } else if (q.options !== undefined) {
      addIssue('options hanya berlaku untuk pertanyaan pilihan');
    }
  });

/** Union blok dengan diskriminator `type` (hasil parse untuk question tetap satu tipe). */
export const blockSchema = z.discriminatedUnion('type', [
  headingBlock,
  textBlock,
  imageBlock,
  dividerBlock,
  questionBlock,
]);

export type HeadingBlock = z.infer<typeof headingBlock>;
export type TextBlock = z.infer<typeof textBlock>;
export type ImageBlock = z.infer<typeof imageBlock>;
export type DividerBlock = z.infer<typeof dividerBlock>;
export type QuestionBlock = z.infer<typeof questionBlock>;
export type FormBlock = z.infer<typeof blockSchema>;

// ---------------------------------------------------------------------------
// Form (root)
// ---------------------------------------------------------------------------

export const formSchema = z.strictObject({
  schemaVersion: z.literal(FORM_SCHEMA_VERSION),
  theme: themeSchema,
  blocks: z
    .array(blockSchema)
    .max(LIMITS.maxBlocksPerForm, `maksimal ${LIMITS.maxBlocksPerForm} blok per form`)
    .superRefine((blocks, ctx) => {
      const addIssue = (message: string, path: (string | number)[] = []) => {
        ctx.addIssue({ code: 'custom', message, input: blocks, path });
      };

      // id wajib unik lintas SEMUA jenis blok (ruang id dibagi, contoh b1..b4/q1..q3)
      const seen = new Map<string, number>();
      blocks.forEach((block, i) => {
        const first = seen.get(block.id);
        if (first === undefined) {
          seen.set(block.id, i);
        } else {
          // path relatif terhadap array `blocks`
          addIssue(`id "${block.id}" duplikat dengan blok index ${first}`, [i]);
        }
      });

      const questionCount = blocks.filter((b) => b.type === 'question').length;
      if (questionCount > LIMITS.maxQuestionsPerForm) {
        addIssue(`maksimal ${LIMITS.maxQuestionsPerForm} pertanyaan per form`);
      }
    }),
});

export type FormSchemaData = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Karena zod v4: error tidak lagi pakai .flatten()/.format() — pakai z.flattenError.
// ---------------------------------------------------------------------------

export interface SchemaIssue {
  /** path berbentuk "blocks.2.options" (kosong = level root). */
  path: string;
  message: string;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; issues: SchemaIssue[] };

export interface AnswerIssue {
  questionId: string | null;
  message: string;
}

/** Hasil validasi jawaban — pesan error langsung siap dirender/dikirim ke responden. */
export type AnswerResult =
  | { ok: true; data: FormAnswers }
  | { ok: false; issues: AnswerIssue[] };

/** Validasi & parse payload schema dari builder (dipakai juga untuk publish). */
export function parseFormSchema(input: unknown): ParseResult<FormSchemaData> {
  const result = formSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
}

// ---------------------------------------------------------------------------
// Jawaban responden (TASK 4.5: { "<questionId>": string | string[] | number })
// ---------------------------------------------------------------------------

export type FormAnswerValue = string | string[] | number;
export type FormAnswers = Record<string, FormAnswerValue>;

/**
 * Validasi jawaban TERHADAP schema yang sudah lolos parse (versi form saat itu).
 * - id tidak dikenal → ditolak.
 * - pertanyaan required kosong → ditolak.
 * - tipe sesuai kind: teks = string, pilihan = string (single) / string[] (multi), skala = bilangan bulat.
 * - jawaban kosong pada pertanyaan opsional dibuang dari hasil (dinormalisasi).
 * Tidak mengembalikan error zod — pesannya siap dirender/dikirim ke responden.
 */
export function validateAnswers(
  form: FormSchemaData,
  input: unknown,
): AnswerResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      issues: [
        { questionId: null, message: 'jawaban harus berupa object { questionId: nilai }' },
      ],
    };
  }

  const questions = new Map<string, QuestionBlock>();
  for (const block of form.blocks) {
    if (block.type === 'question') questions.set(block.id, block);
  }

  const raw = input as Record<string, unknown>;
  const issues: AnswerIssue[] = [];
  const answers: FormAnswers = {};

  // id yang tidak dikenal → jalur nakal/spam.
  for (const key of Object.keys(raw)) {
    if (!questions.has(key)) {
      issues.push({ questionId: key, message: 'pertanyaan tidak dikenal' });
    }
  }

  for (const question of questions.values()) {
    const value = raw[question.id];

    if (value === undefined) {
      if (question.required) {
        issues.push({ questionId: question.id, message: 'jawaban wajib diisi' });
      }
      continue;
    }

    if (question.kind === 'short_text' || question.kind === 'paragraph') {
      if (typeof value !== 'string') {
        issues.push({ questionId: question.id, message: 'jawaban harus berupa teks' });
        continue;
      }
      const limit = question.maxLength ?? LIMITS.maxTextAnswerLength;
      if (value.length > limit) {
        issues.push({
          questionId: question.id,
          message: `jawaban maksimal ${limit} karakter`,
        });
        continue;
      }
      if (value.trim() === '') {
        // kosong = dianggap tidak menjawab
        if (question.required) {
          issues.push({ questionId: question.id, message: 'jawaban wajib diisi' });
        }
        continue;
      }
      answers[question.id] = value;
      continue;
    }

    if (question.kind === 'single_choice' || question.kind === 'dropdown') {
      if (typeof value !== 'string') {
        issues.push({ questionId: question.id, message: 'pilih salah satu opsi' });
        continue;
      }
      if (value.trim() === '') {
        if (question.required) {
          issues.push({ questionId: question.id, message: 'jawaban wajib diisi' });
        }
        continue;
      }
      if (!question.options?.includes(value)) {
        issues.push({ questionId: question.id, message: 'pilihan tidak tersedia pada form ini' });
        continue;
      }
      answers[question.id] = value;
      continue;
    }

    if (question.kind === 'multiple_choice') {
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        issues.push({ questionId: question.id, message: 'jawaban harus berupa daftar opsi' });
        continue;
      }
      const picked = value as string[];
      const unique = [...new Set(picked)];
      if (unique.length !== picked.length || picked.some((v) => v.trim() === '')) {
        issues.push({ questionId: question.id, message: 'pilihan tidak valid' });
        continue;
      }
      if (picked.length > 0 && picked.some((v) => !question.options?.includes(v))) {
        issues.push({ questionId: question.id, message: 'pilihan tidak tersedia pada form ini' });
        continue;
      }
      if (picked.length === 0) {
        if (question.required) {
          issues.push({ questionId: question.id, message: 'jawaban wajib diisi' });
        }
        continue;
      }
      answers[question.id] = unique;
      continue;
    }

    // scale
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      issues.push({ questionId: question.id, message: 'jawaban skala harus berupa bilangan bulat' });
      continue;
    }
    const min = question.min ?? 1;
    const max = question.max ?? 5;
    if (value < min || value > max) {
      issues.push({
        questionId: question.id,
        message: `jawaban skala harus antara ${min} sampai ${max}`,
      });
      continue;
    }
    answers[question.id] = value;
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, data: answers };
}
