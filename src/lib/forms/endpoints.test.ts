import { describe, expect, it } from 'vitest';
import { formDataTooLarge, payloadTooLarge } from './endpoints';
import { LIMITS } from '../config/limits';

describe('payloadTooLarge — header pre-check', () => {
  it('lebih dari batas via content-length → true; tanpa header → false', async () => {
    const big = new Request('http://x', { headers: { 'content-length': String(LIMITS.maxSubmitPayloadBytes + 1) } });
    const ok = new Request('http://x', { headers: { 'content-length': '10' } });
    const none = new Request('http://x', { method: 'POST' });
    expect(await payloadTooLarge(big)).toBe(true);
    expect(await payloadTooLarge(ok)).toBe(false);
    expect(await payloadTooLarge(none)).toBe(false);
  });
});

describe('formDataTooLarge — ukur isi sebenarnya (S3, anti header palsu)', () => {
  it('string biasa di bawah batas → false', async () => {
    const fd = new FormData();
    fd.set('q1', 'a'.repeat(1000));
    expect(await formDataTooLarge(fd)).toBe(false);
  });

  it('gabungan entri melebihi batas → true (juga memotong awal saat sudah lewat)', async () => {
    const fd = new FormData();
    for (let i = 0; i < 20; i++) fd.append(`q${i}`, 'x'.repeat(4_000)); // 80KB total
    expect(await formDataTooLarge(fd)).toBe(true);
  });

  it('satu entri raksasa langsung ditolak', async () => {
    const fd = new FormData();
    fd.set('q1', 'y'.repeat(LIMITS.maxSubmitPayloadBytes + 10));
    expect(await formDataTooLarge(fd)).toBe(true);
  });

  it('berkas (File) dihitung dari size-nya', async () => {
    const fd = new FormData();
    fd.set('anon', 'kecil');
    fd.set('file', new File(['x'.repeat(LIMITS.maxSubmitPayloadBytes + 1)], 'evil.png', { type: 'image/png' }));
    expect(await formDataTooLarge(fd)).toBe(true);
  });
});
