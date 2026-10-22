import { describe, expect, it } from 'vitest';
import {
  buildKeepSet,
  collectSchemaPublicIds,
  formAssetIds,
  selectOrphans,
} from './cleanup-plan.mjs';
import { isManagedPublicId } from './public-id.mjs';

const now = new Date('2026-10-22T12:00:00.000Z');

describe('publicId yang dikelola', () => {
  it('hanya menerima folder form/ dengan karakter aman', () => {
    expect(isManagedPublicId('form/abc_123')).toBe(true);
    expect(isManagedPublicId('form/a/b-c')).toBe(true);
    expect(isManagedPublicId('banner/abc')).toBe(false);
    expect(isManagedPublicId('form/../etc')).toBe(false);
    expect(isManagedPublicId('https://evil.test/x')).toBe(false);
    expect(isManagedPublicId('')).toBe(false);
  });
});

describe('collectSchemaPublicIds', () => {
  it('mengambil banner + gambar blok, mengabaikan URL/teks bebas', () => {
    const ids = collectSchemaPublicIds({
      theme: { bannerPublicId: 'form/banner' },
      blocks: [
        { type: 'image', publicId: 'form/img1' },
        { type: 'text', text: 'form/bukan-gambar' },
        { type: 'image', publicId: 'https://evil.test/a.png' },
      ],
    });
    expect([...ids].sort()).toEqual(['form/banner', 'form/img1']);
  });

  it('aman untuk schema kosong / bukan objek', () => {
    expect(collectSchemaPublicIds(null).size).toBe(0);
    expect(collectSchemaPublicIds('form/x').size).toBe(0);
  });
});

describe('buildKeepSet', () => {
  it('menggabungkan baris DB dan referensi schema', () => {
    const keep = buildKeepSet({
      imagePublicIds: ['form/db', 'banner/ignored'],
      forms: [{ schema: { theme: { bannerPublicId: 'form/schema' } } }],
    });
    expect([...keep].sort()).toEqual(['form/db', 'form/schema']);
  });
});

describe('selectOrphans', () => {
  const assets = [
    { public_id: 'form/lama', created_at: '2026-10-20T00:00:00.000Z' },
    { public_id: 'form/baru', created_at: '2026-10-22T11:30:00.000Z' },
    { public_id: 'form/dipakai', created_at: '2026-10-20T00:00:00.000Z' },
    { public_id: 'banner/luar', created_at: '2026-10-20T00:00:00.000Z' },
    { public_id: 'form/tanpa-tanggal' },
  ];

  it('hanya aset lama, tidak dipakai, dan di folder form/', () => {
    const orphans = selectOrphans({
      assets,
      keep: new Set(['form/dipakai']),
      now,
      minAgeHours: 24,
    });
    expect(orphans.map((asset) => asset.public_id)).toEqual(['form/lama']);
  });

  it('aset tanpa created_at valid tidak pernah dihapus', () => {
    const orphans = selectOrphans({ assets, keep: new Set(), now, minAgeHours: 0 });
    expect(orphans.some((asset) => asset.public_id === 'form/tanpa-tanggal')).toBe(false);
  });
});

describe('formAssetIds', () => {
  it('menggabungkan aset schema dan baris gambar milik form', () => {
    const ids = formAssetIds({
      schema: { theme: { bannerPublicId: 'form/a' } },
      imageRows: [{ public_id: 'form/b' }, { public_id: 'banner/luar' }],
    });
    expect(ids.sort()).toEqual(['form/a', 'form/b']);
  });
});
