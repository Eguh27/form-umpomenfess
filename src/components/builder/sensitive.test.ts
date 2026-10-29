import { describe, expect, it } from 'vitest';
import { emptyState } from './defaults';
import { addBlock, updateBlock } from './state';
import {
  isCriticalLabel,
  isSensitiveLabel,
  criticalQuestionIds,
  sensitiveQuestionIds,
} from './sensitive';

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

  it('sensitiveQuestionIds memicu pemblokiran publish saat ada pertanyaan sensitif dan pulih saat dibersihkan', () => {
    let s = emptyState('Form Uji');
    expect(sensitiveQuestionIds(s.blocks).length).toBe(0);

    // Tambah pertanyaan umum (tidak memblokir)
    s = addBlock(s, 'question')!;
    const q1 = s.blocks[0].id;
    s = updateBlock(s, q1, { label: 'Nama Lengkap' });
    expect(sensitiveQuestionIds(s.blocks).length).toBe(0);

    // Tambah pertanyaan phishing / data sensitif (harus memblokir)
    s = addBlock(s, 'question')!;
    const q2 = s.blocks[1].id;
    s = updateBlock(s, q2, { label: 'Masukkan Kata Sandi Akun' });
    const blockedIds = sensitiveQuestionIds(s.blocks);
    expect(blockedIds.length).toBe(1);
    expect(blockedIds).toEqual([q2]);

    // Hapus/perbaiki pertanyaan sensitif -> pemblokiran dicabut
    s = updateBlock(s, q2, { label: 'Alamat Email' });
    expect(sensitiveQuestionIds(s.blocks).length).toBe(0);
  });
});

describe('Opsi B: Proteksi Phishing 2 Tingkat (T-84)', () => {
  it('isCriticalLabel membedakan Tier 1 (Kritis) dari Tier 2 (Sensitif Bersyarat)', () => {
    // Tier 1 Kritis -> true
    expect(isCriticalLabel('Apa kata sandi akunmu?')).toBe(true);
    expect(isCriticalLabel('Password wifi')).toBe(true);
    expect(isCriticalLabel('Masukkan kode OTP SMS')).toBe(true);
    expect(isCriticalLabel('3 digit CVV kartu')).toBe(true);
    expect(isCriticalLabel('PIN ATM Anda')).toBe(true);

    // Tier 2 Sensitif Bersyarat -> false untuk isCriticalLabel, tetapi true untuk isSensitiveLabel
    expect(isCriticalLabel('Masukkan NIK KTP')).toBe(false);
    expect(isSensitiveLabel('Masukkan NIK KTP')).toBe(true);

    expect(isCriticalLabel('Nomor rekening bank')).toBe(false);
    expect(isSensitiveLabel('Nomor rekening bank')).toBe(true);

    expect(isCriticalLabel('Nomor BPJS Kesehatan')).toBe(false);
    expect(isSensitiveLabel('Nomor BPJS Kesehatan')).toBe(true);

    expect(isCriticalLabel('PIN titik lokasi rumah')).toBe(false);
    expect(isSensitiveLabel('PIN titik lokasi rumah')).toBe(true);

    // Pertanyaan wajar -> false untuk keduanya
    expect(isCriticalLabel('Nama Lengkap')).toBe(false);
    expect(isSensitiveLabel('Nama Lengkap')).toBe(false);
  });

  it('criticalQuestionIds hanya memblokir pertanyaan Tier 1 (Autosave & Publish Block)', () => {
    let s = emptyState('Form Tingkat 2');
    s = addBlock(s, 'question')!;
    const q1 = s.blocks[0].id;
    s = updateBlock(s, q1, { label: 'Nomor Rekening Donasi' });

    // Tier 2: sensitif ada (publish diblokir), tetapi critical tidak ada (autosave diizinkan!)
    expect(sensitiveQuestionIds(s.blocks)).toEqual([q1]);
    expect(criticalQuestionIds(s.blocks)).toEqual([]);

    // Tambah Tier 1: kata sandi
    s = addBlock(s, 'question')!;
    const q2 = s.blocks[1].id;
    s = updateBlock(s, q2, { label: 'Kata Sandi M-Banking' });

    // Keduanya terdeteksi
    expect(sensitiveQuestionIds(s.blocks)).toEqual([q1, q2]);
    expect(criticalQuestionIds(s.blocks)).toEqual([q2]);

    // Hapus pertanyaan Tier 1 (kata sandi)
    s = updateBlock(s, q2, { label: 'Nama Bank' });
    expect(criticalQuestionIds(s.blocks)).toEqual([]);
    expect(sensitiveQuestionIds(s.blocks)).toEqual([q1]);
  });
});


