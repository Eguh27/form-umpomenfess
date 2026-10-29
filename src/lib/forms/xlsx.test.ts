import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildXlsx, formatLocalTimestamp, sanitizeXlsxCell, xlsxFilename } from './xlsx';
import type { FormSchemaData } from './schema';

describe('formatLocalTimestamp', () => {
  it('mengonversi ISO string ke format tanggal dan jam lokal WIB yang mudah dibaca', () => {
    const formatted = formatLocalTimestamp('2026-10-29T10:05:00.000Z');
    expect(formatted).toBe('29 Okt 2026, 17:05:00');
  });

  it('mengembalikan string apa adanya jika format ISO tidak valid', () => {
    expect(formatLocalTimestamp('bukan-tanggal-valid')).toBe('bukan-tanggal-valid');
  });
});

describe('sanitizeXlsxCell', () => {
  it('membiarkan string normal apa adanya', () => {
    expect(sanitizeXlsxCell('Danang')).toBe('Danang');
    expect(sanitizeXlsxCell('12345')).toBe('12345');
    expect(sanitizeXlsxCell('Jawaban dengan koma, dan spasi')).toBe('Jawaban dengan koma, dan spasi');
  });

  it('menetralisir karakter formula injection dengan awalan tanda kutip tunggal', () => {
    expect(sanitizeXlsxCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeXlsxCell('+cmd|')).toBe("'+cmd|");
    expect(sanitizeXlsxCell('-10+20')).toBe("'-10+20");
    expect(sanitizeXlsxCell('@malicious')).toBe("'@malicious");
  });
});

describe('xlsxFilename', () => {
  it('menghasilkan nama file .xlsx yang aman dan menyertakan tanggal', () => {
    const fn = xlsxFilename('survei-kepuasan-2026', new Date('2026-10-29T00:00:00Z'));
    expect(fn).toBe('survei-kepuasan-2026-2026-10-29.xlsx');
  });

  it('membersihkan karakter liar dan fallback ke form jika slug kosong', () => {
    expect(xlsxFilename('///$$$///', new Date('2026-10-29T00:00:00Z'))).toBe('form-2026-10-29.xlsx');
  });
});

describe('buildXlsx', () => {
  it('menghasilkan workbook Excel valid dengan header, data baris, dan sanitasi formula', async () => {
    const dummySchema: FormSchemaData = {
      schemaVersion: 1,
      blocks: [
        {
          id: 'q_name',
          type: 'question',
          label: 'Nama Lengkap',
          kind: 'short_text',
          required: true,
        },
        {
          id: 'q_hobbies',
          type: 'question',
          label: 'Hobi',
          kind: 'multiple_choice',
          options: ['Membaca', 'Olahraga', 'Coding'],
          required: false,
        },
        {
          id: 'q_formula',
          type: 'question',
          label: 'Catatan',
          kind: 'paragraph',
          required: false,
        },
      ],
      theme: {
        font: 'system-ui',
        accent: '#2F7263',
        bg: '#F8FAF9',
        text: '#1A2E29',
        radius: 16,
        cardStyle: 'plain',
        bannerPublicId: null,
      },
    };

    const dummyRows = [
      {
        createdAt: '2026-10-29T10:00:00.000Z',
        answers: {
          q_name: 'Budi Santoso',
          q_hobbies: ['Membaca', 'Olahraga'],
          q_formula: '=1+2',
        },
      },
      {
        createdAt: '2026-10-29T10:05:00.000Z',
        answers: {
          q_name: 'Siti Aminah',
          q_hobbies: ['Coding'],
          q_formula: 'Aman tanpa formula',
        },
      },
    ];

    const bytes = await buildXlsx(dummySchema, dummyRows);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // Verifikasi membaca ulang workbook dengan ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);

    const worksheet = workbook.getWorksheet('Respons Formulir');
    expect(worksheet).toBeDefined();

    // Baris 1: Header
    const row1 = worksheet?.getRow(1);
    expect(row1?.getCell(1).value).toBe('Waktu Submit');
    expect(row1?.getCell(2).value).toBe('Nama Lengkap');
    expect(row1?.getCell(3).value).toBe('Hobi');
    expect(row1?.getCell(4).value).toBe('Catatan');

    // Baris 2: Data 1
    const row2 = worksheet?.getRow(2);
    expect(row2?.getCell(1).value).toBe('29 Okt 2026, 17:00:00');
    expect(row2?.getCell(2).value).toBe('Budi Santoso');
    expect(row2?.getCell(3).value).toBe('Membaca; Olahraga');
    expect(row2?.getCell(4).value).toBe("'=1+2"); // Dinertalisir

    // Baris 3: Data 2
    const row3 = worksheet?.getRow(3);
    expect(row3?.getCell(1).value).toBe('29 Okt 2026, 17:05:00');
    expect(row3?.getCell(2).value).toBe('Siti Aminah');
    expect(row3?.getCell(3).value).toBe('Coding');
    expect(row3?.getCell(4).value).toBe('Aman tanpa formula');
  });
});
