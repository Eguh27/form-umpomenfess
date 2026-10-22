/**
 * uploadRules.ts — pengecekan murni unggahan T-42 (dapat diuji tanpa DOM).
 * Batas dari TASK 4.2 via LIMITS: maks 2 MB, jenis gambar tertentu.
 */
import { LIMITS } from '../../lib/config/limits';

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export type FileCheck =
  | { ok: true }
  | { ok: false; reason: string };

export function checkFile(meta: { bytes: number; mime: string }): FileCheck {
  if (!ACCEPTED_MIME.includes(meta.mime as (typeof ACCEPTED_MIME)[number])) {
    const ext = meta.mime.split('/')[1] ?? meta.mime;
    return { ok: false, reason: `Jenis .${ext} tidak didukung (jpg/png/webp/gif).` };
  }
  if (meta.bytes <= 0) {
    return { ok: false, reason: 'Berkas kosong.' };
  }
  if (meta.bytes > LIMITS.maxImageBytes) {
    const mb = (LIMITS.maxImageBytes / (1024 * 1024)).toFixed(1);
    return { ok: false, reason: `Ukuran melewati batas ${mb} MB.` };
  }
  return { ok: true };
}

/** Validasi bentuk respons /api/uploads/sign (dipakai BannerUpload). */
export interface SignPayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  folder: string;
}

export function parseSignResponse(input: unknown): SignPayload | null {
  if (typeof input !== 'object' || input === null) return null;
  const r = input as Record<string, unknown>;
  const required = ['cloudName', 'apiKey', 'signature', 'publicId', 'folder'] as const;
  if (required.some((k) => typeof r[k] !== 'string' || (r[k] as string) === '')) return null;
  if (typeof r.timestamp !== 'number') return null;
  // publicId harus folder form/ + aman (sama seperti pattern schema)
  const pid = String(r.publicId);
  if (!pid.startsWith('form/') || !/^[A-Za-z0-9][A-Za-z0-9/_-]{0,199}$/.test(pid)) return null;
  return {
    cloudName: String(r.cloudName),
    apiKey: String(r.apiKey),
    timestamp: r.timestamp,
    signature: String(r.signature),
    publicId: pid,
    folder: String(r.folder),
  };
}
