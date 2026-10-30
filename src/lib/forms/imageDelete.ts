/**
 * src/lib/forms/imageDelete.ts — Helper penghapusan aset Cloudinary di server (T-89).
 *
 * Menggunakan Cloudinary Admin API untuk menghapus berkas gambar secara permanen.
 * Kredensial rahasia (CLOUDINARY_API_SECRET) hanya digunakan di lingkungan server.
 */
import { SCHEMA_LIMITS } from './schema';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** Memeriksa apakah publicId valid dan berada di dalam namespace terkelola (form/). */
export function isValidPublicId(publicId: string): boolean {
  return typeof publicId === 'string' && SCHEMA_LIMITS.publicIdPattern.test(publicId);
}

/**
 * Menghapus satu aset gambar di Cloudinary secara permanen.
 * Mengembalikan status penghapusan ('deleted' atau 'not_found' dianggap sukses).
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  config: CloudinaryConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!isValidPublicId(publicId)) {
    return { ok: false, error: 'public_id_tidak_valid' };
  }

  const { cloudName, apiKey, apiSecret } = config;
  const baseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}`;
  const auth = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;

  try {
    const url = `${baseUrl}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`;
    const res = await fetchImpl(url, {
      method: 'DELETE',
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
    });

    const body = (await res.json().catch(() => ({}))) as {
      deleted?: Record<string, string>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    }

    const status = (body?.deleted?.[publicId] ?? 'unknown').toLowerCase();
    const ok = status === 'deleted' || status === 'not_found';
    return { ok, status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
