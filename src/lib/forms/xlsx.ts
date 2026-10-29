/**
 * src/lib/forms/xlsx.ts — Generator spreadsheet Microsoft Excel (.xlsx) aman (T-86).
 *
 * Mengonversi skema form dan respons menjadi workbook biner .xlsx.
 * Menyertakan proteksi formula injection (sel berawalan = + - @ dinetralkan),
 * styling baris header, auto-fit lebar kolom, dan format waktu ISO.
 */
import ExcelJS from 'exceljs';
import type { FormSchemaData } from './schema';
import { answerToText, type CsvRowInput } from './csv';

const RISK_FIRST = /^[=+\-@\t\r]/;

/** Nilai sel yang aman dari formula injection Excel. */
export function sanitizeXlsxCell(val: string): string {
  if (RISK_FIRST.test(val)) {
    return `'${val}`;
  }
  return val;
}

/**
 * Mengonversi timestamp ISO ke format tanggal dan jam lokal Indonesia (WIB) yang mudah dibaca.
 * Contoh: "29 Okt 2026, 17:05:00"
 */
export function formatLocalTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const datePart = d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\./g, ':');

    return `${datePart}, ${timePart}`;
  } catch {
    return isoString;
  }
}

/** Nama file aman untuk Content-Disposition .xlsx. */
export function xlsxFilename(slug: string, date = new Date()): string {
  const base = slug.replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'form';
  return `${base}-${date.toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Menghasilkan buffer file Excel (.xlsx) dari skema formulir dan daftar jawaban respons.
 */
export async function buildXlsx(form: FormSchemaData, rows: CsvRowInput[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UMPO Menfess Form';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Respons Formulir', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const questions = form.blocks.filter((b) => b.type === 'question');
  const headerTitles = ['Waktu Submit', ...questions.map((q) => q.label || 'Pertanyaan')];

  // Header row
  const headerRow = worksheet.addRow(headerTitles);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

  // Data rows
  for (const row of rows) {
    const values = [
      formatLocalTimestamp(row.createdAt), // Format tanggal & jam lokal yang mudah dibaca
      ...questions.map((q) => sanitizeXlsxCell(answerToText(row.answers[q.id]))),
    ];
    const dataRow = worksheet.addRow(values);
    dataRow.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  // Auto-fit lebar kolom
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
      if (val.length > maxLength) {
        maxLength = val.length;
      }
    });
    column.width = Math.min(Math.max(maxLength + 3, 14), 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
