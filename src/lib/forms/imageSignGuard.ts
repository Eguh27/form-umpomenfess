/**
 * E-A1 — pemagang formId & cap gambar untuk POST /api/uploads/sign.
 *
 * resolveOwnedFormId: memvalidasi format uuid + kepemilikan lewat klien user
 * (SELECT dibatasi RLS — baris milik sendiri saja). null = bukan milik atau
 * tidak ada → satu kode 404 generik (anti-probing IDOR).
 *
 * checkImageCap: formId terisi → hitung baris milik FORM ini (semua state,
 * batas eksak maxImages); formId null → jalur legacy interim (tmp per
 * pemilik, batas 2×). Alasan 'backend' = galat DB → endpoint membalas 500;
 * galat jangan dibengkokan menjadi keputusan bisnis.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FormIdGuard =
  | { ok: true; formId: string }
  | { ok: false; reason: 'payload' | 'form_tidak_dikenal' | 'backend' };

export async function resolveOwnedFormId(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<FormIdGuard> {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    return { ok: false, reason: 'payload' };
  }
  const { data, error } = await supabase.from('forms').select('id').eq('id', raw).maybeSingle();
  if (error !== null) return { ok: false, reason: 'backend' };
  if (data === null) return { ok: false, reason: 'form_tidak_dikenal' };
  return { ok: true, formId: raw };
}

export interface ImageCapResult {
  allowed: boolean;
  count: number;
  /** true = hitungan eksak per-form; false = jalur legacy per-pemilik. */
  exact: boolean;
  reason?: 'terlalu_banyak_upload_form' | 'terlalu_banyak_upload_tmp' | 'backend';
}

export async function checkImageCap(
  supabase: SupabaseClient,
  args: { formId: string | null; ownerId: string; maxImages: number },
): Promise<ImageCapResult> {
  if (args.formId !== null) {
    const { count, error } = await supabase
      .from('form_images')
      .select('id', { count: 'exact', head: true })
      .eq('form_id', args.formId);
    if (error !== null) return { allowed: false, count: 0, exact: true, reason: 'backend' };
    const total = count ?? 0;
    if (total >= args.maxImages) {
      return { allowed: false, count: total, exact: true, reason: 'terlalu_banyak_upload_form' };
    }
    return { allowed: true, count: total, exact: true };
  }
  const { count, error } = await supabase
    .from('form_images')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', args.ownerId)
    .eq('state', 'tmp');
  if (error !== null) return { allowed: false, count: 0, exact: false, reason: 'backend' };
  const total = count ?? 0;
  if (total >= args.maxImages * 2) {
    return { allowed: false, count: total, exact: false, reason: 'terlalu_banyak_upload_tmp' };
  }
  return { allowed: true, count: total, exact: false };
}
