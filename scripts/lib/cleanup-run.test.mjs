import { describe, expect, it } from 'vitest';
import { CLEANUP_DEFAULTS, runCleanup } from './cleanup-run.mjs';

const now = new Date('2026-10-22T12:00:00.000Z');

function fakeDb(overrides = {}) {
  const calls = { closed: [], deletedImages: [], deletedForms: [], markedUsed: [], sequence: [] };
  const base = {
    calls,
    listExpiredForms: async () => [],
    closeForms: async (ids) => {
      calls.closed.push(ids);
      calls.sequence.push('close');
      return ids.length;
    },
    listTmpImages: async () => [],
    markImagesUsed: async (ids) => {
      calls.markedUsed.push(ids);
      return ids.length;
    },
    deleteImageRows: async (ids) => {
      calls.deletedImages.push(ids);
      calls.sequence.push('images');
      return ids.length;
    },
    listSoftDeletedForms: async () => [],
    listImagesForForms: async () => [],
    listAllImagePublicIds: async () => [],
    listAllFormSchemas: async () => [],
    listStaleForms: async () => [],
    deleteForms: async (ids) => {
      calls.deletedForms.push(ids);
      calls.sequence.push('forms');
      return ids.length;
    },
    ...overrides,
  };
  return base;
}

function fakeCloudinary({ assets = [], statuses = {}, listError = null, deleteError = null } = {}) {
  const calls = { deletes: [] };
  return {
    calls,
    async listAssets() {
      if (listError) throw listError;
      return assets;
    },
    async deleteAssets(ids) {
      calls.deletes.push(ids);
      if (deleteError) throw deleteError;
      return new Map(ids.map((id) => [id, statuses[id] ?? 'deleted']));
    },
  };
}

function run({ mode = 'daily', apply = false, db, cloudinary, options = {} }) {
  return runCleanup({
    now,
    apply,
    mode,
    db,
    cloudinary,
    options: { ...CLEANUP_DEFAULTS, ...options },
  });
}

describe('cleanup harian', () => {
  it('dry-run hanya membaca, tidak menutup/menghapus', async () => {
    const db = fakeDb({
      listExpiredForms: async () => [{ id: 'f1' }, { id: 'f2' }],
      listTmpImages: async () => [{ id: 'i1', public_id: 'form/i1' }],
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ db, cloudinary });

    expect(summary.daily).toEqual({
      expiredForms: 2,
      closedForms: 0,
      tmpImages: 1,
      tmpImagesInUse: 0,
      deletedTmpImages: 0,
    });
    expect(db.calls.closed).toEqual([]);
    expect(db.calls.deletedImages).toEqual([]);
    expect(cloudinary.calls.deletes).toEqual([]);
    expect(summary.errors).toEqual([]);
  });

  it('apply menutup form dan hanya menghapus baris yang asetnya hilang', async () => {
    const db = fakeDb({
      listExpiredForms: async () => [{ id: 'f1' }],
      listTmpImages: async () => [
        { id: 'i1', public_id: 'form/ok' },
        { id: 'i2', public_id: 'form/notfound' },
        { id: 'i3', public_id: 'form/fail' },
        { id: 'i4', public_id: 'banner/aneh' },
      ],
    });
    const cloudinary = fakeCloudinary({
      statuses: { 'form/ok': 'deleted', 'form/notfound': 'not found', 'form/fail': 'error' },
    });
    const summary = await run({ db, cloudinary, apply: true });

    expect(summary.daily.closedForms).toBe(1);
    expect(db.calls.closed).toEqual([['f1']]);
    expect(summary.daily.deletedTmpImages).toBe(3);
    expect(db.calls.deletedImages.flat().sort()).toEqual(['i1', 'i2', 'i4']);
  });

  it('gambar tmp yang masih dirujuk schema ditandai used, bukan dihapus', async () => {
    const db = fakeDb({
      listTmpImages: async () => [{ id: 'i1', public_id: 'form/dipakai' }],
      listAllFormSchemas: async () => [
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/dipakai' } } },
      ],
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ db, cloudinary, apply: true });

    expect(summary.daily.tmpImagesInUse).toBe(1);
    expect(summary.daily.deletedTmpImages).toBe(0);
    expect(db.calls.markedUsed).toEqual([['i1']]);
    expect(db.calls.deletedImages).toEqual([]);
    expect(cloudinary.calls.deletes).toEqual([]);
  });

  it('keep-set gambar tmp gagal dimuat -> tidak menghapus apa pun', async () => {
    const db = fakeDb({
      listTmpImages: async () => [{ id: 'i1', public_id: 'form/x' }],
      listAllFormSchemas: async () => {
        throw new Error('DB down');
      },
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ db, cloudinary, apply: true });

    expect(summary.errors.map((e) => e.step)).toContain('muat-keep-set-gambar-tmp');
    expect(db.calls.deletedImages).toEqual([]);
    expect(cloudinary.calls.deletes).toEqual([]);
  });

  it('kegagalan Cloudinary dicatat dan baris DB tidak dihapus', async () => {
    const db = fakeDb({
      listTmpImages: async () => [{ id: 'i1', public_id: 'form/i1' }],
    });
    const cloudinary = fakeCloudinary({ deleteError: new Error('Cloudinary down') });
    const summary = await run({ db, cloudinary, apply: true });

    expect(summary.errors.map((e) => e.step)).toContain('hapus-gambar-tmp');
    expect(db.calls.deletedImages).toEqual([]);
  });
});

describe('cleanup mingguan', () => {
  it('hanya menghapus orphan lama yang tidak dirujuk DB/schema', async () => {
    const db = fakeDb({
      listAllFormSchemas: async () => [
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/keep' } } },
      ],
      listAllImagePublicIds: async () => ['form/dbkeep'],
    });
    const cloudinary = fakeCloudinary({
      assets: [
        { public_id: 'form/keep', created_at: '2026-10-01T00:00:00.000Z' },
        { public_id: 'form/dbkeep', created_at: '2026-10-01T00:00:00.000Z' },
        { public_id: 'form/orphan-lama', created_at: '2026-10-01T00:00:00.000Z' },
        { public_id: 'form/orphan-baru', created_at: '2026-10-22T11:59:00.000Z' },
      ],
    });
    const summary = await run({ mode: 'weekly', apply: true, db, cloudinary });

    expect(summary.weekly.orphans).toBe(1);
    expect(summary.weekly.deletedOrphans).toBe(1);
    expect(cloudinary.calls.deletes).toEqual([['form/orphan-lama']]);
  });

  it('keep-set gagal dimuat -> orphan TIDAK disentuh', async () => {
    const db = fakeDb({
      listAllFormSchemas: async () => {
        throw new Error('DB down');
      },
    });
    const cloudinary = fakeCloudinary({ assets: [{ public_id: 'form/x', created_at: '2020-01-01' }] });
    const summary = await run({ mode: 'weekly', apply: true, db, cloudinary });

    expect(summary.errors.map((e) => e.step)).toContain('muat-keep-set');
    expect(summary.weekly.orphans).toBe(0);
    expect(cloudinary.calls.deletes).toEqual([]);
  });

  it('purge soft-deleted menghapus aset, baris gambar, lalu form', async () => {
    const db = fakeDb({
      listSoftDeletedForms: async () => [
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/a' } } },
      ],
      listImagesForForms: async () => [{ id: 'row1', form_id: 'f1', public_id: 'form/b' }],
      listStaleForms: async () => [{ id: 'f2' }, { id: 'f3' }],
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ mode: 'weekly', apply: true, db, cloudinary });

    expect(cloudinary.calls.deletes).toContainEqual(expect.arrayContaining(['form/a', 'form/b']));
    expect(db.calls.sequence).toEqual(['images', 'forms']);
    expect(summary.weekly.softDeletedForms).toBe(1);
    expect(summary.weekly.purgedForms).toBe(1);
    expect(summary.weekly.purgedImages).toBe(1);
    expect(summary.weekly.staleForms).toBe(2);
  });

  it('aset yang masih dipakai form lain tidak dihapus saat purge', async () => {
    const db = fakeDb({
      listAllFormSchemas: async () => [
        { id: 'aktif', schema: { theme: { bannerPublicId: 'form/shared' } } },
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/shared' } } },
      ],
      listSoftDeletedForms: async () => [
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/shared' } } },
      ],
      listImagesForForms: async () => [{ id: 'row1', form_id: 'f1', public_id: 'form/own' }],
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ mode: 'weekly', apply: true, db, cloudinary });

    expect(cloudinary.calls.deletes).toEqual([['form/own']]);
    expect(summary.weekly.purgedForms).toBe(1);
  });

  it('dry-run melaporkan kandidat purge tanpa mengubah data', async () => {
    const db = fakeDb({
      listSoftDeletedForms: async () => [{ id: 'f1', schema: {} }],
    });
    const cloudinary = fakeCloudinary();
    const summary = await run({ mode: 'weekly', apply: false, db, cloudinary });

    expect(summary.weekly.softDeletedForms).toBe(1);
    expect(summary.weekly.purgedForms).toBe(0);
    expect(db.calls.deletedImages).toEqual([]);
    expect(db.calls.deletedForms).toEqual([]);
  });

  it('satu aset gagal dihapus -> form tidak dipurge', async () => {
    const db = fakeDb({
      listSoftDeletedForms: async () => [
        { id: 'f1', schema: { theme: { bannerPublicId: 'form/a' } } },
      ],
      listImagesForForms: async () => [{ id: 'row1', form_id: 'f1', public_id: 'form/b' }],
    });
    const cloudinary = fakeCloudinary({ statuses: { 'form/a': 'deleted', 'form/b': 'error' } });
    const summary = await run({ mode: 'weekly', apply: true, db, cloudinary });

    expect(summary.weekly.purgedForms).toBe(0);
    expect(db.calls.deletedImages).toEqual([]);
    expect(db.calls.deletedForms).toEqual([]);
  });
});
