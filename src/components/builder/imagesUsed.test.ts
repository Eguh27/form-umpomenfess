import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { markReferencedImagesUsed, referencedPublicIds } from './imagesUsed';
import type { FormSchemaData } from '../../lib/forms/schema';

/** Data schema minimal — hanya field yang dibaca modul ini (dipaksa lewat cast). */
const schema = (blocks: unknown[], banner: string | null) =>
  ({
    blocks,
    theme: { bannerPublicId: banner },
  }) as unknown as FormSchemaData;

const divider = { id: 'b1', type: 'divider' };
const image = (id: string, publicId: string) => ({ id, type: 'image', publicId });

describe('referencedPublicIds — blok gambar + banner, unik', () => {
  it('kumpulkan publicId blok image + banner; publicId kosong diabaikan', () => {
    const ids = referencedPublicIds(
      schema([divider, image('b2', 'form/aa'), image('b3', ''), image('b4', 'form/bb')], 'form/aa'),
    );
    expect(ids.sort()).toEqual(['form/aa', 'form/bb']);
  });

  it('tanpa banner & tanpa gambar → array kosong', () => {
    expect(referencedPublicIds(schema([divider, divider], null))).toEqual([]);
    expect(referencedPublicIds(schema([], null))).toEqual([]);
  });

  it('duplikat publicId didedupe', () => {
    const ids = referencedPublicIds(schema([image('b1', 'form/x'), image('b2', 'form/x')], 'form/x'));
    expect(ids).toEqual(['form/x']);
  });
});

/** Fake client: catat patch + filter chain supabase-js (update().in().eq()). */
const fakeClient = (errorValue: unknown) => {
  const calls: { patch: Record<string, unknown>; in: unknown; eq: unknown }[] = [];
  const client = {
    from: () => ({
      update: (patch: Record<string, unknown>) => ({
        in: (_: string, values: string[]) => ({
          eq: (_2: string, value: string) => {
            calls.push({ patch, in: values, eq: value });
            return Promise.resolve({ error: errorValue });
          },
        }),
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, calls };
};

describe('markReferencedImagesUsed — update tmp → used (RLS owner), tak menjatuhkan simpanan', () => {
  it('ids kosong → true tanpa memanggil DB', async () => {
    const { client, calls } = fakeClient(null);
    const ok = await markReferencedImagesUsed(client, 'form1', schema([divider], null));
    expect(ok).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('update memakai state used + form_id, filter in(public_id) + eq(state,tmp)', async () => {
    const { client, calls } = fakeClient(null);
    const ok = await markReferencedImagesUsed(
      client,
      'form-1',
      schema([image('b1', 'form/x'), image('b2', 'form/y')], null),
    );
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].patch).toEqual({ state: 'used', form_id: 'form-1' });
    expect(calls[0].in).toEqual(['form/x', 'form/y']);
    expect(calls[0].eq).toBe('tmp');
  });

  it('gagal DB → false (endpoint autosave tetap sukses)', async () => {
    const { client, calls } = fakeClient({ message: 'violates policy' });
    const ok = await markReferencedImagesUsed(client, 'form-2', schema([], 'form/z'));
    expect(ok).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0].in).toEqual(['form/z']);
  });
});
