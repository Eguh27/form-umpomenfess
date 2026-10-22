import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  blankPayload,
  duplicatePayload,
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
