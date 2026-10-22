import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  blankPayload,
  duplicatePayload,
  insertForm,
  mapFormRows,
  templatePayload,
  type TemplateRow,
} from './dashboardForms';
import { parseFormSchema } from '../../lib/forms/schema';

/** Stub Supabase — payload builder diparse lokal; tidak ada query nyata. QQ: type-only. */
const stub = {} as SupabaseClient;

describe('blankPayload', () => {
  it('menghasilkan schema yang LOLOS parseFormSchema (T-44)', () => {
    const payload = blankPayload('Survei Kantin');
    const parsed = parseFormSchema(payload.schema);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.blocks).toEqual([]);
      expect(parsed.data.schemaVersion).toBe(1);
    }
  });

  it('theme telah disalin ke kolom theme dan schema.theme sama', () => {
    const payload = blankPayload('x');
    expect(payload.theme).toEqual(
      (payload.schema as { theme: unknown }).theme,
    );
  });
});

describe('templatePayload / duplicatePayload', () => {
  const template: TemplateRow = {
    id: 'tpl-1',
    name: 'Skala Likert',
    title: 'Skala Likert 5',
    schemaJson: {
      schemaVersion: 1,
      theme: { bg: '#fdeeec', accent: '#e8604c', text: '#1f4d46', font: 'system-ui', radius: 16, cardStyle: 'menfess', bannerPublicId: null },
      blocks: [
        { id: 'q1', type: 'question', kind: 'scale', label: 'Puas?', min: 1, max: 5 },
      ],
    },
    previewUrl: null,
  };

  it('template: schema & theme verbatim tetap LOLOS validator (font ikut whitelist @C)', () => {
    const payload = templatePayload(template);
    expect(parseFormSchema(payload.schema).ok).toBe(true);
    expect(payload.theme).toEqual(
      (payload.schema as { theme: unknown }).theme,
    );
    expect(payload.title).toBe('Skala Likert 5');
  });

  it('duplicate: schema asli disalin utuh & tetap valid', () => {
    const payload = duplicatePayload({ title: 'Asli', schemas: template.schemaJson, theme: null });
    expect(payload.title).toBe('Asli (2)');
    expect(parseFormSchema(payload.schema as Record<string, unknown>).ok).toBe(true);
  });

  it('duplicate tanpa schema (jarang) → fallback default tetap valid', () => {
    const payload = duplicatePayload({ title: 'Asli', schemas: null, theme: null });
    expect(parseFormSchema(payload.schema).ok).toBe(true);
  });
});

describe('mapFormRows', () => {
  it('memetakan kolom snake_case → FormRow + responses(count)', () => {
    const rows = mapFormRows([
      {
        id: 'f1',
        slug: 'survei',
        title: 'Survei',
        status: 'published',
        max_responses: 100,
        closes_at: null,
        updated_at: '2026-10-22T00:00:00Z',
        responses: [{ count: 7 }],
      },
    ]);
    expect(rows[0]).toEqual({
      id: 'f1',
      slug: 'survei',
      title: 'Survei',
      status: 'published',
      responses: 7,
      maxResponses: 100,
      closesAt: null,
      updatedAt: '2026-10-22T00:00:00Z',
    });
  });

  it('tanpa relasi count → 0', () => {
    expect(mapFormRows([{ id: 'f2', slug: 'a', title: 'A', status: 'draft', updated_at: '2026-01-01', responses: [] }])[0].responses).toBe(0);
  });

  it('stub type-only tidak dipakai (hindari unused import)', () => {
    expect(typeof stub).toBe('object');
  });
});

/** Fake klien Supabase untuk insertForm: auth.getUser + ranta insert. */
function insertFake(opts: {
  userId?: string | null;
  userError?: unknown;
  count?: number;
  results?: Array<{ data: { id: string; slug: string } | null; error: { code?: string; message?: string } | null }>;
}) {
  const inserted: Record<string, unknown>[] = [];
  let call = 0;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: opts.userId === null ? null : { id: opts.userId ?? 'user-1' } },
        error: opts.userError ?? null,
      }),
    },
    from: () => {
      const chain: Record<string, unknown> = {};
      const result = () => opts.results?.[call++] ?? { data: { id: 'f-new', slug: 'slug' }, error: null };
      chain.select = () => chain;
      chain.is = () => chain;
      chain.neq = () => chain;
      chain.eq = () => chain;
      chain.insert = (payload: Record<string, unknown>) => {
        inserted.push(payload);
        return chain;
      };
      chain.single = async () => result();
      chain.then = (res: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null, count: opts.count ?? 0 }).then(res);
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, inserted };
}

describe('insertForm — owner_id dari sesi (E1: form tak bisa dibuat tanpa owner)', () => {
  it('menyertakan owner_id dari sesi saat insert', async () => {
    const { client, inserted } = insertFake({ userId: 'user-abc' });
    const created = await insertForm(client, blankPayload('Survei Kantin'));
    expect(created.id).toBe('f-new');
    expect(inserted).toHaveLength(1);
    expect(inserted[0].owner_id).toBe('user-abc');
  });

  it('slug bentrok (23505) → percobaan ulang dengan suffix', async () => {
    const { client, inserted } = insertFake({
      userId: 'user-abc',
      results: [
        { data: null, error: { code: '23505', message: 'duplicate key' } },
        { data: { id: 'f-2', slug: 'survei-kantin-2' }, error: null },
      ],
    });
    const created = await insertForm(client, blankPayload('Survei Kantin'));
    expect(created.slug).toBe('survei-kantin-2');
    expect(inserted).toHaveLength(2);
    expect(inserted[1].slug).not.toBe(inserted[0].slug);
  });

  it('galat lain → pesan ramah, BUKAN pesan Postgres mentah', async () => {
    const { client } = insertFake({
      userId: 'user-abc',
      results: [
        {
          data: null,
          error: { code: '23502', message: 'null value in column "owner_id" violates not-null constraint' },
        },
      ],
    });
    const err = (await insertForm(client, blankPayload('x')).catch((e: unknown) => e)) as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/Gagal membuat form/);
    expect(err.message).not.toMatch(/not-null constraint/);
  });

  it('sesi tak ada → pesan ramah, tak ada insert', async () => {
    const { client, inserted } = insertFake({ userId: null });
    await expect(insertForm(client, blankPayload('x'))).rejects.toThrow(/Sesi habis/);
    expect(inserted).toHaveLength(0);
  });

  it('batas form aktif → ditolak sebelum insert', async () => {
    const { client, inserted } = insertFake({ userId: 'user-abc', count: 99 });
    await expect(insertForm(client, blankPayload('x'))).rejects.toThrow(/Batas 20 form aktif/);
    expect(inserted).toHaveLength(0);
  });
});
