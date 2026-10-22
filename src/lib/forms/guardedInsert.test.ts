import { describe, expect, it, vi } from 'vitest';
import { tryGuardedInsert } from './guardedInsert';

/** Fake service.setara supabase-js: rpc → { data, error }. */
const fakeService = (impl: () => Promise<unknown>) =>
  ({ rpc: vi.fn().mockImplementation(async () => impl()) }) as never;

const form = { id: '11111111-1111-1111-1111-111111111111', version: 2 };

describe('tryGuardedInsert — mapping kode SQL → hasil endpoint (R1/R2)', () => {
  it('ok → sukses', async () => {
    const result = await tryGuardedInsert(fakeService(async () => ({ data: 'ok', error: null })), form, {}, null);
    expect(result).toEqual({ ok: true });
  });

  it('duplikat → gagal dgn reason duplikat (endpoint = sukses UX)', async () => {
    const result = await tryGuardedInsert(fakeService(async () => ({ data: 'duplikat', error: null })), form, {}, 'tok');
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false, reason: 'duplikat' });
  });

  it('sudah_tutup / penuh diteruskan apa adanya', async () => {
    const penuh = await tryGuardedInsert(fakeService(async () => ({ data: 'penuh', error: null })), form, {}, null);
    const tutup = await tryGuardedInsert(fakeService(async () => ({ data: 'sudah_tutup', error: null })), form, {}, null);
    expect(penuh).toMatchObject({ ok: false, reason: 'penuh' });
    expect(tutup).toMatchObject({ ok: false, reason: 'sudah_tutup' });
  });

  it('postgres 42883 (fungsi belum dipush) → backend_belum_siap (fallback legacy)', async () => {
    const result = await tryGuardedInsert(
      fakeService(async () => ({ data: null, error: { code: '42883', message: 'function does not exist' } })),
      form, {}, null,
    );
    expect(result).toMatchObject({ ok: false, reason: 'backend_belum_siap' });
  });

  it('error DB lain → gagal_db', async () => {
    const result = await tryGuardedInsert(
      fakeService(async () => ({ data: null, error: { code: '23505', message: 'violates unique constraint lain' } })),
      form, {}, null,
    );
    expect(result).toMatchObject({ ok: false, reason: 'gagal_db' });
  });

  it('throw jaringan jua gagal_db (tanpa lempar)', async () => {
    const result = await tryGuardedInsert(fakeService(async () => { throw new Error('fetch failed'); }), form, {}, null);
    expect(result).toMatchObject({ ok: false, reason: 'gagal_db' });
  });

  it('data kosong → gagal_db (bukan sukses tanpa bukti)', async () => {
    const result = await tryGuardedInsert(fakeService(async () => ({ data: null, error: null })), form, {}, null);
    expect(result).toMatchObject({ ok: false, reason: 'gagal_db' });
  });
});
