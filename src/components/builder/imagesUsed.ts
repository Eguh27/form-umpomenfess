/**
 * imagesUsed.ts — T-64 @B (temuan review T-62/T-63): baris `form_images`
 * state 'tmp' dibuat saat upload, tetapi tak ada yang memindahkannya ke
 * 'used' — cap 2×tmp per pemilik cepat penuh dan cleanup tak tahu gambar
 * mana yang punya pemilik. Modul ini menandai SEMUA publicId yang direferensi
 * schema/theme tiap kali form tersimpan (auto maupun publish).
 *
 * - RLS (form_images_update_own) membatasi update hanya ke baris milik
 *   user yang login — owner_id tidak dikirim dari klien.
 * - form_id diset untuk bookkeeping primary-user; copy/duplicate form bisa
 *   membagi publicId — bersih-bersih tetap milik cron cleanup (D) yang juga
 *   melindungi tmp yang masih dirujuk schema.
 * - Kegagalan jaringan/RLS TIDAK menjatuhkan penyimpanan form: boolean saja.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormSchemaData } from '../../lib/forms/schema';

/** publicId yang direferensi oleh schema: blok gambar + banner tema. */
export function referencedPublicIds(schema: FormSchemaData): string[] {
  const ids: string[] = [];
  for (const block of schema.blocks) {
    if (block.type === 'image' && block.publicId !== '') ids.push(block.publicId);
  }
  if (schema.theme.bannerPublicId !== null) ids.push(schema.theme.bannerPublicId);
  return [...new Set(ids)];
}

/** Tandai tmp → used utk setiap publicId yang dirujuk idempoten. */
export async function markReferencedImagesUsed(
  supabase: SupabaseClient,
  formId: string,
  schema: FormSchemaData,
): Promise<boolean> {
  const ids = referencedPublicIds(schema);
  if (ids.length === 0) return true;

  const { error } = await supabase
    .from('form_images')
    .update({ state: 'used', form_id: formId })
    .in('public_id', ids)
    .eq('state', 'tmp');
  return error === null;
}
