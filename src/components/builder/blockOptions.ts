/**
 * blockOptions.ts — logika murni untuk memanipulasi opsi pilihan jawaban (T-73).
 * Menjaga batas SCHEMA_LIMITS (maxOptions = 26, maxOptionLength = 100).
 */
import { SCHEMA_LIMITS } from '../../lib/forms/schema';

/** Cari nama default baru yang belum dipakai: "Opsi 1", "Opsi 2", dst. */
export function nextOptionLabel(existing: string[]): string {
  const existingSet = new Set(existing.map((o) => o.trim().toLowerCase()));
  let count = existing.length + 1;
  while (existingSet.has(`opsi ${count}`.toLowerCase())) {
    count++;
  }
  return `Opsi ${count}`;
}

/** Tambah opsi baru (append atau sisipkan di indeks tertentu). */
export function addOption(options: string[], atIndex?: number): string[] {
  if (options.length >= SCHEMA_LIMITS.maxOptions) return options;
  const label = nextOptionLabel(options);
  const next = [...options];
  if (typeof atIndex === 'number' && atIndex >= 0 && atIndex < next.length) {
    next.splice(atIndex + 1, 0, label);
  } else {
    next.push(label);
  }
  return next;
}

/** Perbarui satu opsi pada indeks tertentu. */
export function updateOption(options: string[], index: number, value: string): string[] {
  if (index < 0 || index >= options.length) return options;
  const next = [...options];
  next[index] = value;
  return next;
}

/** Hapus opsi pada indeks tertentu (minimal menyisakan 1 opsi). */
export function removeOption(options: string[], index: number): string[] {
  if (options.length <= 1) return options;
  if (index < 0 || index >= options.length) return options;
  return options.filter((_, i) => i !== index);
}

/** Pisahkan teks banyak baris (mis. hasil tempel/paste) menjadi array opsi. */
export function parsePastedOptions(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, SCHEMA_LIMITS.maxOptions);
}

/** Cek apakah ada opsi duplikat (case-insensitive setelah trim). */
export function hasDuplicateOptions(options: string[]): boolean {
  const trimmed = options.map((o) => o.trim().toLowerCase()).filter((o) => o.length > 0);
  return new Set(trimmed).size !== trimmed.length;
}

/** Cek apakah ada opsi yang kosong. */
export function hasEmptyOption(options: string[]): boolean {
  return options.some((o) => o.trim() === '');
}
