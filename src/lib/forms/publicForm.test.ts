import { describe, expect, it } from 'vitest';
import {
  answersFromFormData,
  closedState,
  errKind,
  errMessage,
  parsePublicSchema,
  publicFontStack,
  validateSubmit,
  type PublicFormRow,
} from './publicForm';
import { parseFormSchema } from './schema';

const row: PublicFormRow = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'survei',
  title: 'Survei',
  schema: null,
  schema_version: 1,
  version: 1,
  closes_at: null,
  max_responses: null,
};

const schema = {
  schemaVersion: 1 as const,
  theme: {
    bg: '#fdeeec', accent: '#e8604c', text: '#1f4d46',
    font: 'Quicksand' as const, radius: 16, cardStyle: 'menfess' as const, bannerPublicId: null,
  },
  blocks: [
    { id: 'q1', type: 'question' as const, kind: 'short_text' as const, label: 'Nama', required: true },
    { id: 'q2', type: 'question' as const, kind: 'multiple_choice' as const, label: 'Warna', required: false, options: ['merah', 'biru'] },
    { id: 'q3', type: 'question' as const, kind: 'scale' as const, label: 'Puas', required: false, min: 1, max: 3 },
  ],
};

/** Schema sudah statik-valid di fixture; parse sekali, gagal → lempar agar test bersuara. */
const validSchema = (() => {
  const parsed = parseFormSchema(schema);
  if (!parsed.ok) throw new Error('fixture schema tidak valid');
  return parsed.data;
})();

const validate = (fd: FormData) => validateSubmit(validSchema, fd);

describe('closedState (T-52)', () => {
  it('terbuka default', () => {
    expect(closedState(row, 0)).toEqual({ closed: false });
  });

  it('tutup lewat closes_at', () => {
    expect(closedState({ closes_at: '2020-01-01T00:00:00Z', max_responses: null }, 0).closed).toBe(true);
    expect(closedState({ closes_at: '2099-01-01T00:00:00Z', max_responses: null }, 0).closed).toBe(false);
  });

  it('penuh lewat max_responses', () => {
    expect(closedState({ closes_at: null, max_responses: 10 }, 10)).toEqual({ closed: true, code: 'penuh' });
    expect(closedState({ closes_at: null, max_responses: 10 }, 9).closed).toBe(false);
  });
});

describe('parsePublicSchema', () => {
  it('valid → data; rusak → null (tidak dirender)', () => {
    expect(parsePublicSchema({ schema })).not.toBeNull();
    expect(parsePublicSchema({ schema: null })).toBeNull();
  });
});

describe('answersFromFormData / validateSubmit', () => {
  it('multi pilihan diambil getAll; skala jadi angka; teks string', () => {
    const fd = new FormData();
    fd.set('q1', ' Rina ');
    fd.append('q2', 'merah');
    fd.append('q2', 'biru');
    const result = validate(fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers.q1).toBe(' Rina ');
      expect(result.answers.q2).toEqual(['merah', 'biru']);
      expect('q3' in result.answers).toBe(false); // falsehood diabaikan
    }
  });

  it('skala "2.5" ditolak, tidak didiamkan hilang', () => {
    const fd = new FormData();
    fd.set('q1', 'Rina');
    fd.set('q3', '2.5');
    expect(validate(fd).ok).toBe(false);
  });

  it('wajib kosong → gagal + id tidak dikenal ditolak validator', () => {
    const fd = new FormData();
    fd.set('evil', '<script>');
    const result = validate(fd);
    expect(result.ok).toBe(false);
  });

  it('answersFromFormData: field asing tidak ikut', () => {
    const fd = new FormData();
    fd.set('q1', 'Rina');
    fd.set('hack', 'x');
    const a = answersFromFormData(validSchema, fd);
    expect(Object.keys(a)).toEqual(['q1']);
  });
});

describe('publicFontStack — semua anggota whitelist baripunya map', () => {
  it('Quicksand/Baloo 2/Georgia/system-ui', () => {
    expect(publicFontStack('Quicksand')).toContain('Quicksand');
    expect(publicFontStack('Baloo 2')).toContain('Baloo 2');
    expect(publicFontStack('Georgia')).toContain('Georgia');
    expect(publicFontStack('system-ui')).toContain('system-ui');
  });
});

describe('errMessage hanya kode yang dikenal', () => {
  it('kode jahat tidak direfleksikan', () => {
    expect(errMessage('<script>csrf</script>')).toBeNull();
    expect(errMessage('ratelimit')).toContain('banyak');
    expect(errMessage(null)).toBeNull();
  });
});

describe('errKind memisahkan sukses dari galat (S5)', () => {
  it('lapor_ok = sukses; kode galat dikenal = galat; tak dikenal = null', () => {
    expect(errKind('lapor_ok')).toBe('sukses');
    expect(errKind('ratelimit')).toBe('galat');
    expect(errKind('tidak_ada_kode')).toBeNull();
    expect(errKind(null)).toBeNull();
  });
});
