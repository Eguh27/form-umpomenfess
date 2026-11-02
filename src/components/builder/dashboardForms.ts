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
  archivedAt: string | null;
  deletedAt?: string | null;
  bannerPublicId?: string | null;
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

const FORM_COLUMNS = 'id, slug, title, status, archived_at, deleted_at, schema, max_responses, closes_at, updated_at, responses(count)';

/** Antrian → FormRow; relasi responses(count) bentuk [{count:n}]. */
export function mapFormRows(data: Record<string, unknown>[]): FormRow[] {
  return data.map((raw) => {
    const counts = raw.responses as Array<{ count: number }> | null;
    const themeObj = (raw.schema as { theme?: { bannerPublicId?: string | null } } | null)?.theme;
    return {
      id: String(raw.id),
      slug: String(raw.slug),
      title: String(raw.title),
      status: String(raw.status),
      archivedAt: (raw.archived_at as string | null) ?? null,
      deletedAt: (raw.deleted_at as string | null) ?? null,
      bannerPublicId: themeObj?.bannerPublicId ?? null,
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
  /**
   * `owner_id` SENGAJA tak ada di payload: nilainya diambil dari sesi user
   * saat insert (lihat `insertForm`) sehingga tak ada jalur pemalsuan pemilik.
   * Kolom `forms.owner_id` NOT NULL + policy `forms_insert_own` mewajibkan
   * `owner_id = auth.uid()`.
   */
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

/** Error Postgres mentah tak pernah ditampilkan ke user (bocor detail skema). */
function friendlyError(error: { code?: string } | null, action: string): Error {
  const code = error?.code ?? '';
  if (code === '42501') return new Error('Sesi tidak diizinkan melakukan itu — masuk ulang lalu coba.');
  if (code === '23503') return new Error('Sesi tidak valid lagi — masuk ulang lalu coba.');
  if (code === '23514') return new Error('Data tidak valid — periksa isian lalu coba lagi.');
  if (code === '23505') return new Error(`Gagal ${action} — nama sudah dipakai. Coba judul lain.`);
  return new Error(`Gagal ${action} — coba lagi sebentar.`);
}

/**
 * Insert dengan perang unik slug lintas pengguna: setiap 23505 → suffix acak
 * baru (maks 5 percobaan). Batas form aktif dicek dulu dari klien.
 *
 * `owner_id` diambil dari SESI (`auth.getUser()`), bukan dari argumen —
 * kolomnya NOT NULL dan policy RLS mewajibkan `owner_id = auth.uid()`.
 */
export async function insertForm(
  supabase: SupabaseClient,
  payload: FormInsertPayload,
): Promise<{ id: string; slug: string }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.warn('[dashboard] getUser gagal:', userError.message);
    throw new Error('Tidak bisa memastikan sesi — cek koneksi lalu coba lagi.');
  }
  const ownerId = userData?.user?.id;
  if (ownerId === undefined || ownerId === '') {
    throw new Error('Sesi habis — masuk ulang lalu buat form.');
  }

  const { count, error } = await supabase
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .neq('status', 'closed');
  if (error) throw friendlyError(error, 'mengecek batas form');
  if ((count ?? 0) >= LIMITS.maxActiveFormsPerUser) {
    throw new Error(`Batas ${LIMITS.maxActiveFormsPerUser} form aktif — tutup/hapus yang lama dulu.`);
  }

  let slug = payload.slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error: insertError } = await supabase
      .from('forms')
      .insert({ ...payload, owner_id: ownerId, slug })
      .select('id, slug')
      .single();
    if (!insertError && data) return { id: String(data.id), slug: String(data.slug) };
    const code = (insertError as { code?: string } | null)?.code;
    if (code !== '23505') {
      console.warn('[dashboard] insert forms gagal:', insertError?.message);
      throw friendlyError(insertError, 'membuat form');
    }
    slug = withSuffix(slug);
  }
  throw new Error('Gagal menemukan slug unik — coba judul lain.');
}

/** Aksi status: tutup (published → closed). */
export async function closeForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('forms').update({ status: 'closed' }).eq('id', id);
  if (error) throw friendlyError(error, 'menutup form');
}

/** Soft delete: set deleted_at (row tetap utk cleanup >30 hari oleh @D). */
export async function deleteForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('forms')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw friendlyError(error, 'menghapus form');
}

/** Arsipkan form: set archived_at (E-A5). Form tidak menerima respons baru. */
export async function archiveForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('forms')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw friendlyError(error, 'mengarsipkan form');
}

/** Batalkan arsip form (E-A5): set archived_at null. */
export async function unarchiveForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('forms')
    .update({ archived_at: null })
    .eq('id', id);
  if (error) throw friendlyError(error, 'mengembalikan form dari arsip');
}

/** Mengambil daftar form di tempat sampah milik user (deleted_at IS NOT NULL). */
export async function listDeletedForms(supabase: SupabaseClient): Promise<FormRow[]> {
  const { data, error } = await supabase
    .from('forms')
    .select(FORM_COLUMNS)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return mapFormRows((data ?? []) as Record<string, unknown>[]);
}

/** Memulihkan form dari tempat sampah: set deleted_at null (T-89). */
export async function restoreForm(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('forms')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw friendlyError(error, 'memulihkan form');
}

/** Menghapus form secara permanen dari database beserta banner Cloudinary (T-89). */
export async function hardDeleteForm(
  supabase: SupabaseClient,
  id: string,
  bannerPublicId?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (bannerPublicId) {
    try {
      await fetchImpl('/api/uploads/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: bannerPublicId }),
      });
    } catch {
      // Lanjutkan penghapusan database walau Cloudinary error
    }
  }

  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('id', id);
  if (error) throw friendlyError(error, 'menghapus form secara permanen');
}

/** Mengosongkan seluruh form di tempat sampah user (T-89). */
export async function emptyTrash(
  supabase: SupabaseClient,
  forms: FormRow[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (const f of forms) {
    await hardDeleteForm(supabase, f.id, f.bannerPublicId, fetchImpl);
  }
}
