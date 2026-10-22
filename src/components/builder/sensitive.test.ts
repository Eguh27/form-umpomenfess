import { describe, expect, it } from 'vitest';
import { emptyState } from './defaults';
import { addBlock, updateBlock } from './state';
import { isSensitiveLabel, sensitiveQuestionIds } from './sensitive';

describe('deteksi pertanyaan sensitif (T-43, TASK 7)', () => {
  it('menangkap kata sandi/password/pin/nik/rekening/bpjs', () => {
    for (const label of [
      'Apa kata sandi akunmu?',
      'Password wifi mur?',
      'PIN aplikasi bank',
      'Masukkan NIK KTP',
      'No. rekening pembayaran',
      'Nomor kartu kredit & CVV',
      'Nomor BPJS',
    ]) {
      expect(isSensitiveLabel(label), label).toBe(true);
    }
  });

  it('tidak salah tangkap "unik"/"pinisipasi" dsb.', () => {
    for (const label of ['Nama panggilan', 'Umur kamu berapa?', 'Ekspektasi acara?', 'Alamat domisili (kota)']) {
      expect(isSensitiveLabel(label), label).toBe(false);
    }
  });

  it('sensitiveQuestionIds hanya memaparkan id pertanyaan', () => {
    let s = emptyState('x');
    s = addBlock(s, 'text')!;
    s = addBlock(s, 'question')!;
    const id = s.blocks[1].id;
    s = updateBlock(s, id, { label: 'Kata sandi wifi?' });
    expect(sensitiveQuestionIds(s.blocks)).toEqual([id]);
  });
});
