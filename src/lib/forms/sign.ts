/**
 * sign.ts — penghitungan tanda tangan Cloudinary (T-42 side C).
 * Murni & tanpa jenis-jabatan node: memakai Web Crypto global (crypto.subtle)
 * sehingga tanda tangan async; test meng-await.
 * Aturan Cloudinary: string ttp = param terurut alfabet "k=v" digabung '&',
 * diakhiri api_secret, SHA-1 hex. Kita tanda: folder=form, public_id,
 * timestamp (urut: folder < public_id < timestamp).
 */

/** Isi hasil tanda tangan utk respons endpoint (dipakai klien BannerUpload). */
export interface SignRequestResult {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  folder: 'form';
}

/** publicId baru selalu dalam folder `form/`, karakter A-Za-z0-9/_- saja. */
export function newPublicId(now: number = Date.now()): string {
  const ts = now.toString(36);
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const rand = btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 10) || 'x';
  return `form/${ts}${rand}`;
}

export async function buildUploadSignature(
  p: { publicId: string; timestamp: number },
  apiSecret: string,
): Promise<string> {
  const toSign = `folder=form&public_id=${p.publicId}&timestamp=${p.timestamp}${apiSecret}`;
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(toSign));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildSignResult(args: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  now?: number;
}): Promise<SignRequestResult> {
  const now = args.now ?? Date.now();
  const publicId = newPublicId(now);
  return {
    cloudName: args.cloudName,
    apiKey: args.apiKey,
    timestamp: now,
    signature: await buildUploadSignature({ publicId, timestamp: now }, args.apiSecret),
    publicId,
    folder: 'form',
  };
}
