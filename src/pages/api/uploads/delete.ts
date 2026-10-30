/**
 * POST /api/uploads/delete — Menghapus permanen aset Cloudinary & row form_images (T-89).
 *
 * Otorisasi: Wajib user login. Memverifikasi publicId valid dengan namespace form/.
 * Menghapus berkas fisik di Cloudinary via Admin API dan menghapus catatan form_images di database.
 */
import { jsonError, jsonOk, payloadTooLarge } from '../../../lib/forms/endpoints';
import { deleteCloudinaryAsset, isValidPublicId } from '../../../lib/forms/imageDelete';
import { createBufferedClient, getEnvConfig } from '../../../lib/auth/supabase';

interface DeleteBody {
  publicId?: unknown;
}

export const POST = async (ctx: {
  locals: { user?: { id: string } | null };
  request: Request;
}): Promise<Response> => {
  const user = ctx.locals?.user ?? null;
  if (user === null) return jsonError('harus_login', 401);
  if (await payloadTooLarge(ctx.request)) return jsonError('payload_besar', 400);

  const cloudName = (import.meta.env.CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ?? '';
  const apiKey = (import.meta.env.CLOUDINARY_API_KEY as string | undefined)?.trim() ?? '';
  const apiSecret = (import.meta.env.CLOUDINARY_API_SECRET as string | undefined)?.trim() ?? '';
  if (cloudName === '' || apiKey === '' || apiSecret === '') {
    return jsonError('backend_belum_konfigurasi', 503);
  }

  let body: DeleteBody;
  try {
    body = (await ctx.request.json()) as DeleteBody;
  } catch {
    return jsonError('payload_tidak_valid', 400);
  }

  const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';
  if (!isValidPublicId(publicId)) {
    return jsonError('public_id_tidak_valid', 400);
  }

  const config = getEnvConfig();
  if (config === null) return jsonError('backend_belum_konfigurasi', 503);
  const { supabase, flush } = createBufferedClient(ctx.request, config);

  // 1. Hapus berkas fisik di Cloudinary
  const delResult = await deleteCloudinaryAsset(publicId, { cloudName, apiKey, apiSecret });
  if (!delResult.ok) {
    return flush(jsonError(`gagal_hapus_cloudinary:${delResult.error ?? 'unknown'}`, 500));
  }

  // 2. Hapus baris dari tabel form_images milik user (RLS form_images_delete_own berlaku)
  await supabase
    .from('form_images')
    .delete()
    .eq('public_id', publicId);

  return flush(jsonOk({ deleted: true, publicId, status: delResult.status }));
};
