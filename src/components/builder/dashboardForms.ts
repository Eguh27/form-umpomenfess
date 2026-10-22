/**
 * dashboardForms.ts — logika data dashboard T-40 (dipanggil dari island).
 * Ditaruh di sini supaya DashboardForms.tsx tinggal UI dan logikanya mudah dites.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { LIMITS } from '../../lib/config/limits';
import { slugify, withSuffix } from './slug';
import { defaultTheme } from './defaults';

export interface FormRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  responses: number;
  maxResponses: number | null;
  closesAt: string | null;
  updatedAt: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  title: string;
  schemaJson: Record<string, unknown> | null;
  previewUrl: string | null;
}

const FORM_COLUMNS = 'id, slug, title, status, max_responses, closes_at, updated_at, responses(count)';

/** Antrian → FormRow; relasi responses(count) bentuk [{count:n}]. */
export function mapFormRows(data: Record<string, unknown>[]): FormRow[] {
  return data.map((raw) => {
    const counts = raw.responses as Array<{ count: number }> | null;
    return {
      id: String(raw.id),
      slug: String(raw.slug),
      title: String(raw.title),
      status: String(raw.status),
      responses: counts && counts[0] ? counts[0].count : 0,
      maxResponses: (raw.max_responses as number | null) ?? null,
      closesAt: (raw.closes_at as string | null) ?? null,
      updatedAt: String(raw.updated_at),
    };
  });
}

/** Daftar form milik user (RLS membatasi) + jumlah respons via relasi count. */
export async function listForms(supabase: SupabaseClient): Promise<FormRow[]> {
  const { data, error } = await supabase
    .from('forms')
    .select(FORM_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapFormRows((data ?? []) as Record<string, unknown>[]);
}

export interface FormInsertPayload {
  slug: string;
  title: string;
  status: 'draft';
  schema: unknown;
  theme: unknown;
  schema_version: 1;
  version: 1;
  tier: 'free';
}

function schemaFor(theme: unknown, blocks: unknown): Record<string, unknown> {
  return { schemaVersion: 1, theme, blocks };
}

export function blankPayload(title: string): FormInsertPayload {
  const theme = defaultTheme();
  return {
    slug: slugify(title),
    title,
    status: 'draft',
    schema: schemaFor(theme, []),
    theme,
    schema_version: 1,
    version: 1,
    tier: 'free',
  };
}

/** Template → payload (schema & theme verbatim dari tabel templates). */
export function templatePayload(t: TemplateRow): FormInsertPayload {
  const theme = t.schemaJson?.theme ?? defaultTheme();
  return {
    slug: slugify(t.title),
    title: t.title || t.name,
    status: 'draft',
    schema: t.schemaJson ?? schemaFor(theme, []),
    theme,
    schema_version: 1,
    version: 1,
    tier: 'free',
  };
}

/** Duplikat → payload yang menyalin schema/theme asli, judul "(2)". */
export function duplicatePayload(original: {
  title: string;
  schemas: unknown;
  theme: unknown;
}): FormInsertPayload {
  const schema = (original.schemas ?? null) as Record<string, unknown> | null;
  const theme = (schema?.theme ?? original.theme ?? defaultTheme()) as unknown;
  return {
    slug: slugify(`${original.title} (2)`),
    title: `${original.title} (2)`,
    status: 'draft',
    schema: schema ?? schemaFor(theme, []),
    theme,
    schema_version: 1,
    version: 1,
    tier: 'free',
  };
}

/**
 * Insert dengan perang unik slug lintas pengguna: setiap 23505 → suffix acak
 * baru (maks 5 percobaan). Batas form aktif dicek dulu dari klien.
 */
export async function insertForm(
  supabase: SupabaseClient,
  payload: FormInsertPayload,
): Promise<{ id: string; slug: string }> {
  const { count, error } = await supabase
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .neq('status', 'closed');
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= LIMITS.maxActiveFormsPerUser) {
    throw new Error(`Batas ${LIMITS.maxActiveFormsPerUser} form aktif — tutup/hapus yang lama dulu.`);
  }

  let slug = payload.slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error: insertError } = await supabase
      .from('forms')
      .insert({ ...payload, slug })
      .select('id, slug')
      .single();
    if (!insertError && data) return { id: String(data.id), slug: String(data.slug) };
    const code = (insertError as { code?: string } | null)?.code;
    if (code !== '23505') throw new Error(insertError.message);
    slug = withSuffix(slug);
  }
  throw new Error('Gagal menemukan slug unik — coba judul lain.');
}

/** Aksi status: tutup (published → closed). */
export async function closeForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('forms').update({ status: 'closed' }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Soft delete: set deleted_at (row tetap utk cleanup >30 hari oleh @D). */
export async function deleteForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('forms')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
