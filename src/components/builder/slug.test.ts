import { describe, expect, it } from 'vitest';
import { slugify, withSuffix, isReserved, sanitizeCandidate } from './slug';

describe('slugify', () => {
  it('judul bebas → slug kecil-tanda-strip', () => {
    expect(slugify('Survei Kebiasaan Nonton!')).toBe('survei-kebiasaan-nonton');
    expect(slugify('  Skripsi   2026  ')).toBe('skripsi-2026');
  });

  it('karakter non-latin dibuang; kosong → slug acak "form-…"', () => {
    expect(slugify('круто')).toMatch(/^form-[a-z0-9]+$/);
    expect(slugify('')).toMatch(/^form-[a-z0-9]+$/);
  });

  it('dipotong 60 karakter', () => {
    expect(slugify('a'.repeat(120)).length).toBeLessThanOrEqual(60);
  });
});

describe('slug dicadangkan', () => {
  it('isReserved true untuk daftar RESERVED_SLUGS', () => {
    expect(isReserved('admin')).toBe(true);
    expect(isReserved('dashboard')).toBe(true);
    expect(isReserved('survei')).toBe(false);
  });

  it('sanitizeCandidate menolak slug cadangan dengan alasan', () => {
    const r = sanitizeCandidate('api');
    expect(r.slug).toBeNull();
    expect(r.reason).toContain('dicadangkan');
  });

  it('sanitizeCandidate lolos untuk judul normal', () => {
    expect(sanitizeCandidate('Form Alum UNSOED')).toEqual({ slug: 'form-alum-unsoed' });
  });
});

describe('withSuffix', () => {
  it('menambahkan suffix acak tanpa melebihi batas', () => {
    const s = withSuffix('a'.repeat(80));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.startsWith('a')).toBe(true);
    expect(withSuffix('x')).not.toBe(withSuffix('x'));
  });
});
