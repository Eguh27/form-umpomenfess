import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UUID_RE, checkImageCap, resolveOwnedFormId } from './imageSignGuard';

const ID = '11111111-1111-1111-1111-111111111111';

describe('UUID_RE', () => {
  it('uuid benar; selain itu ditolak (termasuk path traversal)', () => {
    expect(UUID_RE.test(ID)).toBe(true);
    expect(UUID_RE.test('../../etc')).toBe(false);
    expect(UUID_RE.test('')).toBe(false);
  });
});

/** Fake: forms select().eq().maybeSingle() — pola memakai imagesUsed.test. */
const formsClient = (data: unknown, error: unknown = null) => {
  const calls: string[] = [];
  const client = {
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, id: string) => {
          calls.push(`${table}:${cols}`, `${col}=${id}`);
          return { maybeSingle: () => Promise.resolve({ data, error }) };
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
};

describe('resolveOwnedFormId — kepemilikan diputuskan RLS (klien user)', () => {
  it('raw bukan string → payload, tanpa menyentuh DB', async () => {
    const { client, calls } = formsClient({ id: ID });
    const guard = await resolveOwnedFormId(client, null);
    expect(guard).toMatchObject({ ok: false, reason: 'payload' });
    expect(calls).toHaveLength(0);
  });

  it('format bukan uuid → payload, tanpa menyentuh DB', async () => {
    const { client, calls } = formsClient({ id: ID });
    const guard = await resolveOwnedFormId(client, 'bukan-uuid');
    expect(guard).toMatchObject({ ok: false, reason: 'payload' });
    expect(calls).toHaveLength(0);
  });

  it('uuid & baris terbaca (RLS milik sendiri) → ok dengan formId', async () => {
    const { client, calls } = formsClient({ id: ID });
    const guard = await resolveOwnedFormId(client, ID);
    expect(guard).toMatchObject({ ok: true, formId: ID });
    expect(calls).toEqual(['forms:id', `id=${ID}`]);
  });

  it('uuid tetapi bukan milik / tidak ada (RLS null) → form_tidak_dikenal', async () => {
    const { client } = formsClient(null);
    const guard = await resolveOwnedFormId(client, ID);
    expect(guard).toMatchObject({ ok: false, reason: 'form_tidak_dikenal' });
  });

  it('galat DB → backend (endpoint membalas 500, bukan 404 palsu)', async () => {
    const { client } = formsClient(null, { message: 'koneksi putus' });
    const guard = await resolveOwnedFormId(client, ID);
    expect(guard).toMatchObject({ ok: false, reason: 'backend' });
  });
});

type CapFake = { client: SupabaseClient; filters: string[] };

/** Fake: form_images select(count).eq()… ; hasil di ujung rante+thenable. */
const capClient = (result: { count?: number; error?: unknown }): CapFake => {
  const filters: string[] = [];
  const makeNode = (table: string): Record<string, unknown> => ({
    eq: (col: string) => {
      filters.push(`${table}.${col}`);
      return Object.assign(makeNode(table), {
        then: (fn: (r: { data: null; error: unknown; count: number }) => unknown) =>
          Promise.resolve({
            data: null,
            error: result.error ?? null,
            count: result.count ?? 0,
          }).then(fn),
      });
    },
  });
  const client = {
    from: (table: string) => ({ select: () => makeNode(table) }),
  };
  return { client: client as unknown as SupabaseClient, filters };
};

describe('checkImageCap — eksak per-form vs legacy per-pemilik', () => {
  it('eksak: count >= max → ditolak, exact=true, filter form_id saja', async () => {
    const { client, filters } = capClient({ count: 5 });
    const res = await checkImageCap(client, { formId: ID, ownerId: 'o', maxImages: 5 });
    expect(res).toMatchObject({
      allowed: false,
      count: 5,
      exact: true,
      reason: 'terlalu_banyak_upload_form',
    });
    expect(filters).toEqual(['form_images.form_id']);
  });

  it('eksak: di bawah batas → diizinkan', async () => {
    const { client } = capClient({ count: 4 });
    const res = await checkImageCap(client, { formId: ID, ownerId: 'o', maxImages: 5 });
    expect(res).toMatchObject({ allowed: true, count: 4, exact: true });
  });

  it('legacy: formId null → cap 2× utk tmp per-pemilik, filter owner_id+state', async () => {
    const { client, filters } = capClient({ count: 10 });
    const res = await checkImageCap(client, { formId: null, ownerId: 'owner-x', maxImages: 5 });
    expect(res).toMatchObject({
      allowed: false,
      count: 10,
      exact: false,
      reason: 'terlalu_banyak_upload_tmp',
    });
    expect(filters).toEqual(['form_images.owner_id', 'form_images.state']);
  });

  it('legacy di bawah 2× → diizinkan', async () => {
    const { client } = capClient({ count: 3 });
    const res = await checkImageCap(client, { formId: null, ownerId: 'o', maxImages: 5 });
    expect(res).toMatchObject({ allowed: true, count: 3, exact: false });
  });

  it('galat DB → backend (dinolak aman, bukan dilonjakkan jadi spam)', async () => {
    const { client } = capClient({ error: { message: 'gagal' } });
    const res = await checkImageCap(client, { formId: ID, ownerId: 'o', maxImages: 5 });
    expect(res).toMatchObject({ allowed: false, count: 0, reason: 'backend' });
  });
});
