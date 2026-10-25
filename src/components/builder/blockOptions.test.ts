import { describe, expect, it } from 'vitest';
import {
  addOption,
  hasDuplicateOptions,
  hasEmptyOption,
  nextOptionLabel,
  parsePastedOptions,
  removeOption,
  updateOption,
} from './blockOptions';

describe('nextOptionLabel', () => {
  it('menghasilkan label Opsi 1 jika array kosong', () => {
    expect(nextOptionLabel([])).toBe('Opsi 1');
  });

  it('melanjutkan nomor jika Opsi 1 sudah ada', () => {
    expect(nextOptionLabel(['Opsi 1'])).toBe('Opsi 2');
  });

  it('menghindari bentrok jika Opsi 2 dan Opsi 3 sudah ada', () => {
    expect(nextOptionLabel(['Opsi 1', 'Opsi 2', 'Opsi 3'])).toBe('Opsi 4');
  });
});

describe('addOption', () => {
  it('menambahkan opsi ke akhir array', () => {
    const res = addOption(['Opsi 1']);
    expect(res).toEqual(['Opsi 1', 'Opsi 2']);
  });

  it('menyisipkan opsi di posisi atIndex', () => {
    const res = addOption(['A', 'B'], 0);
    expect(res).toEqual(['A', 'Opsi 3', 'B']);
  });

  it('tidak melebihi batas 26 opsi', () => {
    const maxList = Array.from({ length: 26 }, (_, i) => `Item ${i + 1}`);
    const res = addOption(maxList);
    expect(res).toHaveLength(26);
  });
});

describe('updateOption', () => {
  it('memperbarui nilai pada indeks yang valid', () => {
    const res = updateOption(['A', 'B'], 1, 'C');
    expect(res).toEqual(['A', 'C']);
  });

  it('mengabaikan indeks di luar rentang', () => {
    const list = ['A', 'B'];
    expect(updateOption(list, -1, 'X')).toEqual(list);
    expect(updateOption(list, 5, 'X')).toEqual(list);
  });
});

describe('removeOption', () => {
  it('menghapus item pada indeks yang sesuai', () => {
    const res = removeOption(['A', 'B', 'C'], 1);
    expect(res).toEqual(['A', 'C']);
  });

  it('tidak menghapus jika hanya tersisa 1 opsi (minimal 1)', () => {
    const res = removeOption(['Hanya Satu'], 0);
    expect(res).toEqual(['Hanya Satu']);
  });
});

describe('parsePastedOptions', () => {
  it('memisahkan teks multiline menjadi array opsi', () => {
    const raw = 'Opsi A\nOpsi B\r\n\n  Opsi C  ';
    expect(parsePastedOptions(raw)).toEqual(['Opsi A', 'Opsi B', 'Opsi C']);
  });
});

describe('hasDuplicateOptions & hasEmptyOption', () => {
  it('mendeteksi duplikat case-insensitive', () => {
    expect(hasDuplicateOptions(['Ya', 'Tidak'])).toBe(false);
    expect(hasDuplicateOptions(['Ya', 'ya'])).toBe(true);
    expect(hasDuplicateOptions(['Pilihan ', '  pilihan'])).toBe(true);
  });

  it('mendeteksi opsi kosong', () => {
    expect(hasEmptyOption(['A', 'B'])).toBe(false);
    expect(hasEmptyOption(['A', '   ', 'B'])).toBe(true);
    expect(hasEmptyOption([''])).toBe(true);
  });
});
