import { describe, expect, it } from 'vitest';
import { buildSignResult, buildUploadSignature, newPublicId } from './sign';

describe('newPublicId (T-42)', () => {
  it('selalu folder form/ + karakter aman + unik secukupnya', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const id = newPublicId();
      expect(id.startsWith('form/')).toBe(true);
      expect(/^[A-Za-z0-9][A-Za-z0-9/_-]{0,199}$/.test(id)).toBe(true);
      seen.add(id);
    }
    expect(seen.size).toBeGreaterThan(40); // kecil kemungkinan tabrakan
  });
});

describe('buildUploadSignature — aturan Cloudinary (SHA-1 tangan + secret)', () => {
  it('rumus: folder=form&public_id=…&timestamp=… diakhiri secret', async () => {
    // Vektor tetap: SHA-1("folder=form&public_id=form/k1test&timestamp=1700000000S3CR3T")
    // = 23cbdc49a6ecbf8706a53cf4a30b64d0f61bd8a5... tidak ditebak; dibangun di sini.
    const toSign = 'folder=form&public_id=form/k1test&timestamp=1700000000S3CR3T';
    const digestBytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
    const expected = [...new Uint8Array(digestBytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(await buildUploadSignature({ publicId: 'form/k1test', timestamp: 1700000000 }, 'S3CR3T')).toBe(expected);
  });

  it('beda secret → beda tanda tangan', async () => {
    expect(await buildUploadSignature({ publicId: 'form/a', timestamp: 1 }, 'A'))
      .not.toBe(await buildUploadSignature({ publicId: 'form/a', timestamp: 1 }, 'B'));
  });
});

describe('buildSignResult', () => {
  it('bungkusan lengkap konsisten dengan publicId yang ditandatangani', async () => {
    const out = await buildSignResult({ cloudName: 'demo-cloud', apiKey: '123456', apiSecret: 'S3CR3T', now: 1700000000000 });
    expect(out.cloudName).toBe('demo-cloud');
    expect(out.apiKey).toBe('123456');
    expect(out.folder).toBe('form');
    expect(out.timestamp).toBe(1700000000000);
    expect(out.publicId.startsWith('form/')).toBe(true);
    expect(out.publicId.slice('form/'.length).startsWith((1700000000000).toString(36))).toBe(true);
    const manual = await buildUploadSignature({ publicId: out.publicId, timestamp: out.timestamp }, 'S3CR3T');
    expect(out.signature).toBe(manual);
  });
});
