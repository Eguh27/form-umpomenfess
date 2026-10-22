/**
 * endpoints.ts — helper bersama endpoint API zona C.
 * Dipakai submit.ts & report.ts agar redirect/JSON konsisten dan mudah dites.
 */
import { LIMITS } from '../config/limits';

/** Payload lebih dari batas → true (cek content-length sebelum dibaca). */
export async function payloadTooLarge(req: Request): Promise<boolean> {
  const len = Number(req.headers.get('content-length') ?? '0');
  return Number.isFinite(len) && len > LIMITS.maxSubmitPayloadBytes;
}

/**
 * Batas bayte AKTUAL pasca-parse (anti-chunked header palsu, S3): jumlah ukuran
 * tiap entri FormData — string dihitung UTF-8, file pakai size sebenarnya.
 */
export async function formDataTooLarge(form: FormData, max = LIMITS.maxSubmitPayloadBytes): Promise<boolean> {
  let total = 0;
  for (const value of form.values()) {
    if (value instanceof File) {
      total += value.size;
    } else {
      total += new Blob([value]).size;
    }
    if (total > max) return true;
  }
  return false;
}

/** Redirect berertakode err utk halaman form (pesan pendek diterjemahkan halaman). */
export function redirectBack(slug: string, code: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/f/${slug}?err=${encodeURIComponent(code)}`, 'cache-control': 'no-store' },
  });
}

/** Redirect sukses ke halaman terima kasih (no-store, S6). */
export function redirectThanks(slug: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/f/${slug}/terima-kasih`, 'cache-control': 'no-store' },
  });
}

export function jsonError(code: string, status: number): Response {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Respons 200 JSON (endpoint sign dsb.). */
export function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
