/**
 * turnstile.ts — verifikasi token Cloudflare Turnstile (T-51).
 * Fail-closed: tanpa TURNSTILE_SECRET_KEY → verifikasi GAGAL (bukan diterima).
 * Test memakai mock fetch (vi.stubGlobal) — jangan sentuh akun iklan/nyata.
 */
export interface TurnstileResult {
  ok: boolean;
  reason: string | null;
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyTurnstile(
  token: unknown,
  remoteIp: string | null,
  secret: string | null,
): Promise<TurnstileResult> {
  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, reason: 'captcha_belum_diisi' };
  }
  if (secret === null) {
    return { ok: false, reason: 'captcha_tidak_aktif' };
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp !== null) body.set('remoteip', remoteIp);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    // Cloudflare menerangkan kegagalan token lewat body JSON walau status 200;
    // 4xx/5xx tanpa body JSON pun tetap dibaca (success=false → ditolak).
    const data = (await res.json().catch(() => null)) as (SiteverifyResponse | null);
    if (data !== null && data.success) return { ok: true, reason: null };
    if (data !== null) return { ok: false, reason: 'captcha_ditolak' };
    return { ok: false, reason: 'captcha_verifikasi_gagal' };
  } catch {
    return { ok: false, reason: 'captcha_verifikasi_gagal' };
  }
}
