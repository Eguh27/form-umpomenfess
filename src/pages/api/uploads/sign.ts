/**
 * POST /api/uploads/sign — T-42 (sisi endpoint, kontrak @B di TODO Requests).
 *
 * User login saja. Body JSON {bytes, mime} → dicek ulang server via checkFile
 * (re-use modul klien B — satu sumber aturan). Sauf: buat publicId folder
 * form/ + tanda tangan SHA-1 (B yang upload berkas langsung ke Cloudinary;
 * berkas TIDAK menyentuh server ini). Setiap tanda tangan dicatat baris
 * form_images state 'tmp' (TASK 4.6) lewat klien user agar RLS berlaku.
 * Batas jumlah: belum-terpakai (tmp) per pemilik dibatasi maxImagesPerForm —
 * anti-spam orphan; cap per-form penuh menyusul begitu klien mengirim formId
 * (minta @B — lihat TODO Requests).
 */
import { jsonError, jsonOk } from '../../../lib/forms/endpoints';
import { buildSignResult } from '../../../lib/forms/sign';
import { checkFile } from '../../../components/builder/uploadRules';
import { LIMITS } from '../../../lib/config/limits';
import { createBufferedClient, getEnvConfig } from '../../../lib/auth/supabase';

interface SignBody { bytes?: unknown; mime?: unknown }

export const POST = async (ctx: { locals: { user?: { id: string } | null }; request: Request }): Promise<Response> => {
  const user = ctx.locals?.user ?? null;
  if (user === null) return jsonError('harus_login', 401);

  const cloudName = (import.meta.env.CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ?? '';
  const apiKey = (import.meta.env.CLOUDINARY_API_KEY as string | undefined)?.trim() ?? '';
  const apiSecret = (import.meta.env.CLOUDINARY_API_SECRET as string | undefined)?.trim() ?? '';
  if (cloudName === '' || apiKey === '' || apiSecret === '') return jsonError('backend_belum_konfigurasi', 503);

  let body: SignBody;
  try {
    body = (await ctx.request.json()) as SignBody;
  } catch {
    return jsonError('payload_tidak_valid', 400);
  }
  const check = checkFile({ bytes: Number(body.bytes ?? -1), mime: String(body.mime ?? '') });
  if (!check.ok) return jsonError(`berkas_ditolak:${check.reason}`, 400);

  const config = getEnvConfig();
  if (config === null) return jsonError('backend_belum_konfigurasi', 503);
  const { supabase, flush } = createBufferedClient(ctx.request, config);

  // Anti-numpuk orphan: upload tmp milik pemilik yang belum dipakai ke form.
  const { count, error: countError } = await supabase
    .from('form_images')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('state', 'tmp');
  if (countError !== null) return flush(jsonError('gagal_menghitung_upload', 500));
  if ((count ?? 0) >= LIMITS.maxImagesPerForm * 2) {
    return flush(jsonError('terlalu_banyak_upload_tmp', 429));
  }

  const result = await buildSignResult({ cloudName, apiKey, apiSecret });
  const { error: insertError } = await supabase.from('form_images').insert({
    owner_id: user.id,
    public_id: result.publicId,
    bytes: Math.floor(Number(body.bytes)),
    state: 'tmp',
  });
  if (insertError !== null) return flush(jsonError('gagal_mencatat_upload', 500));

  return flush(jsonOk(result));
};
