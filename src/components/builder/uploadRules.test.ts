import { describe, expect, it } from 'vitest';
import { ACCEPTED_MIME, checkFile, parseSignResponse } from './uploadRules';
import { LIMITS } from '../../lib/config/limits';

describe('checkFile (T-42)', () => {
  it('menerima gambar dalam batas', () => {
    expect(checkFile({ bytes: 1000, mime: 'image/png' })).toEqual({ ok: true });
    expect(checkFile({ bytes: LIMITS.maxImageBytes, mime: 'image/jpeg' })).toEqual({ ok: true });
  });

  it('menolak jenis non-gambar dan ukuran over', () => {
    const pdf = checkFile({ bytes: 10, mime: 'application/pdf' });
    expect(pdf.ok).toBe(false);
    if (!pdf.ok) expect(pdf.reason).toContain('tidak didukung');

    const big = checkFile({ bytes: LIMITS.maxImageBytes + 1, mime: 'image/png' });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.reason).toContain('batas');
  });

  it('menolak berkas kosong', () => {
    expect(checkFile({ bytes: 0, mime: 'image/png' }).ok).toBe(false);
  });

  it('daftar mime yang diterima cukup 4 jenis', () => {
    expect(ACCEPTED_MIME).toHaveLength(4);
  });
});

describe('parseSignResponse', () => {
  const valid = {
    cloudName: 'demo',
    apiKey: '1234',
    timestamp: 1700000000,
    signature: 'abcdef',
    publicId: 'form/abc123',
    folder: 'form',
  };

  it('menerima payload sesuai bentuk', () => {
    expect(parseSignResponse(valid)?.publicId).toBe('form/abc123');
  });

  it('menolak field kosong / tipe salah / publicId di luar folder form', () => {
    expect(parseSignResponse(null)).toBeNull();
    expect(parseSignResponse({ ...valid, signature: '' })).toBeNull();
    expect(parseSignResponse({ ...valid, timestamp: 'x' })).toBeNull();
    expect(parseSignResponse({ ...valid, publicId: 'https://evil.com/x' })).toBeNull();
    expect(parseSignResponse({ ...valid, publicId: 'banner/abc' })).toBeNull();
  });
});
