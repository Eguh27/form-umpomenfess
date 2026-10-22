/**
 * publicForm.ts — logika murni halaman & submit publik (T-50/T-51).
 * Dipisah dari .astro/.ts endpoint agar semua aturan bisa dites (T-54).
 */
import {
  validateAnswers,
  parseFormSchema,
  type FormAnswerValue,
  type FormFont,
  type FormSchemaData,
} from './schema';

export interface PublicFormRow {
  id: string;
  slug: string;
  title: string;
  schema: unknown;
  schema_version: number;
  version: number;
  closes_at: string | null;
  max_responses: number | null;
}

export type ClosedState = { closed: false } | { closed: true; code: 'sudah_tutup' | 'penuh' };

/** Kemudian: tutup lewat closes_at, atau penuh lewat max_responses. */
export function closedState(
  row: Pick<PublicFormRow, 'closes_at' | 'max_responses'>,
  responseCount: number,
  now: Date = new Date(),
): ClosedState {
  if (row.closes_at !== null && new Date(row.closes_at).getTime() <= now.getTime()) {
    return { closed: true, code: 'sudah_tutup' };
  }
  if (row.max_responses !== null && responseCount >= row.max_responses) {
    return { closed: true, code: 'penuh' };
  }
  return { closed: false };
}

/** Parse row view → data schema valid; null = schema rusak (jangan dirender). */
export function parsePublicSchema(row: Pick<PublicFormRow, 'schema'>): FormSchemaData | null {
  const parsed = parseFormSchema(row.schema);
  return parsed.ok ? parsed.data : null;
}

/** formData → jawaban kasar sesuai question (multiple = getAll, skala = Number). */
export function answersFromFormData(
  form: FormSchemaData,
  data: FormData,
): Record<string, FormAnswerValue> {
  const answers: Record<string, FormAnswerValue> = {};
  const used = new Set<string>();
  for (const block of form.blocks) {
    if (block.type !== 'question') continue;
    const q = data.getAll(block.id).map(String);
    if (q.length === 0) continue;
    used.add(block.id);
    if (block.kind === multipleKey) {
      answers[block.id] = data.getAll(block.id).map(String);
      continue;
    }
    if (block.kind === 'scale') {
      const n = Number(q[0]);
      if (Number.isInteger(n)) {
        answers[block.id] = n;
      } else {
        // input rusak (2.5/teks) → TIDAK didiamkan; sudah diteruskan mentah agar
        // validateAnswers menolak dengan pesan "harus bilangan bulat".
        answers[block.id] = q[0];
      }
      continue;
    }
    answers[block.id] = q[0];
  }
  // perlindungan tumpahan: field yang bukan id pertanyaan diabaikan oleh validateAnswers
  void used;
  return answers;
}

// alias agar loop if di atas mudah dibaca
const multipleKey = 'multiple_choice';

/** Endpoint-level: validasi jawaban → { ok, data | code }. */
export type SubmitValidation =
  | { ok: true; answers: Record<string, FormAnswerValue> }
  | { ok: false; code: 'jawaban_tak_valid' };

export function validateSubmit(
  form: FormSchemaData,
  data: FormData,
): SubmitValidation {
  const result = validateAnswers(form, answersFromFormData(form, data));
  if (result.ok) return { ok: true, answers: result.data };
  return { ok: false, code: 'jawaban_tak_valid' };
}

/** Font → stack CSS (duplikat kecil sengaja: halaman publik tidak boleh berkontrol pada builder). */
export function publicFontStack(font: FormFont): string {
  switch (font) {
    case 'Quicksand':
      return "'Quicksand', system-ui, sans-serif";
    case 'Baloo 2':
      return "'Baloo 2', 'Quicksand', sans-serif";
    case 'Georgia':
      return "Georgia, 'Times New Roman', serif";
    case 'system-ui':
      return "system-ui, -apple-system, 'Segoe UI', sans-serif";
  }
}

/** Pesan err berkode (dari query ?err=) — TIDAK PERNAH refleksikan string mentah. */
export function errMessage(code: string | null): string | null {
  switch (code) {
    case 'captcha_belum_diisi':
      return 'Verifikasi anti-bot belum selesai — coba lagi.';
    case 'captcha_ditolak':
    case 'captcha_verifikasi_gagal':
      return 'Verifikasi anti-bot gagal — silakan ulangi.';
    case 'captcha_tidak_aktif':
      return 'Form belum siap (anti-bot belum dikonfigurasi).';
    case 'ratelimit':
      return 'Terlalu banyak mengirim dari jaringan ini — tunggu sekejap.';
    case 'jawaban_tak_valid':
      return 'Jawaban belum lengkap/valid — periksa kembali.';
    case 'kirim':
      return 'Gagal menyimpan jawaban — coba lagi.';
    case 'lapor':
      return 'Gagal mengirim laporan — coba lagi.';
    case 'lapor_ok':
      return 'Terima kasih, laporan sudah kami terima.';
    default:
      return null;
  }
}

/** Kode err mana yang sebenarnya SUKSES (S5 — banner berbeda gaya). */
export function errKind(code: string | null): 'galat' | 'sukses' | null {
  if (code === null) return null;
  if (code === 'lapor_ok') return 'sukses';
  return errMessage(code) !== null ? 'galat' : null;
}

/** URL Cloudinary aman (host project saja). */
export function cloudinaryUrl(publicId: string, cloudName: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`;
}
