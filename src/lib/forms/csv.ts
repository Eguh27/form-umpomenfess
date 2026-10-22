/**
 * csv.ts — pembuat CSV aman (T-53, TASK 4.6/7).
 * Aturan CSV injection: sel yang diawali = + - @ TAB CR diberi awal kutip tunggal;
 * semua sel selalu dibungkus kutip ganda & kutip di dalam di-dobel.
 * Header: waktu + label pertanyaan sesuai urutan schema.
 */
import type { FormSchemaData, FormAnswerValue } from './schema';

const RISK_FIRST = /^[=+\-@\t\r]/;

/** Satu sel → CSV-quoted; nilai berisiko diberi awalan kutip tunggal (Excel aman). */
export function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return RISK_FIRST.test(value) ? `"'${escaped}"` : `"${escaped}"`;
}

/** Nilai jawaban → teks tabel (array dijoin '; '). */
export function answerToText(v: FormAnswerValue | undefined): string {
  if (v === undefined) return '';
  if (Array.isArray(v)) return v.join('; ');
  return String(v);
}

export interface CsvRowInput {
  createdAt: string;
  answers: Record<string, FormAnswerValue>;
}

export function buildCsv(form: FormSchemaData, rows: CsvRowInput[]): string {
  const questions = form.blocks.filter((b) => b.type === 'question');
  const header = ['waktu', ...questions.map((q) => q.label)];
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) {
    const cells = [
      row.createdAt,
      ...questions.map((q) => answerToText(row.answers[q.id])),
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  // CRLF sesuai RFC 4180 (Excel ramah).
  return lines.join('\r\n') + '\r\n';
}

/** Nama file aman utk Content-Disposition. */
export function csvFilename(slug: string, date = new Date()): string {
  const base = slug.replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'form';
  return `${base}-${date.toISOString().slice(0, 10)}.csv`;
}
