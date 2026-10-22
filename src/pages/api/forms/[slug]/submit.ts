/**
 * POST /api/forms/[slug]/submit — T-51 @C.
 *
 * Alur: pemeriksa payload → rate limit per IP → verifikasi Turnstile →
 * muat form (view publik — draft TIDAK terbaca) → cek tutup/kuota →
 * validasi jawaban → INSERT via service role (responses sengaja tanpa INSERT
 * policy, TASK 4.4) → 303 halaman terima kasih.
 * Idempotensi lembut: client_token yang sama dari IP sama dalam 5 menit
 * tidak diinsert dua kali (double-click/refresh); tokenizer sulit dipakai
 * sampai @A menambah kolom client_token (lihat TODO Requests @A).
 */
import { payloadTooLarge, redirectBack, jsonError } from '../../../../lib/forms/endpoints';
import { getSupabaseService } from '../../../../lib/forms/service';
import { verifyTurnstile } from '../../../../lib/forms/turnstile';
import { checkAndRecord, ipFromHeaders } from '../../../../lib/forms/rateLimit';
import {
  closedState,
  parsePublicSchema,
  validateSubmit,
  type PublicFormRow,
} from '../../../../lib/forms/publicForm';

/** idempotensi lembut: `${ip}:${token}` → waktu terakhir terlihat. */
const seen = new Map<string, number>();
const NONCE_TTL = 5 * 60_000;

function alreadySeen(ip: string, token: string, now: number): boolean {
  const key = `${ip}:${token}`;
  const last = seen.get(key);
  return last !== undefined && now - last < NONCE_TTL;
}

function remember(ip: string, token: string, now: number): void {
  if (seen.size > 5000) seen.clear(); // batas memori kasar MVP
  seen.set(`${ip}:${token}`, now);
}

export const POST = async (ctx: { params: Record<string, string | undefined>; request: Request }): Promise<Response> => {
  const slug = ctx.params.slug ?? '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return jsonError('form_tidak_tersedia', 404);

  if (await payloadTooLarge(ctx.request)) return jsonError('payload_besar', 413);

  const form = await ctx.request.formData();

  const ip = ipFromHeaders(ctx.request.headers);
  if (!checkAndRecord(ip)) return redirectBack(slug, 'ratelimit');

  const secret = (import.meta.env.TURNSTILE_SECRET_KEY as string | undefined)?.trim() ?? null;
  const captcha = await verifyTurnstile(form.get('cf-turnstile-response'), ip, secret);
  if (!captcha.ok) return redirectBack(slug, captcha.reason ?? 'captcha_ditolak');

  const service = getSupabaseService();
  if (service === null) return jsonError('backend_belum_konfigurasi', 503);

  // Baca HARUS lewat view publik (service role tidak diteruskan ke tabel forms,
  // supaya draft benar-benar tak terbaca dari jalur mana pun).
  const { data: row, error: loadError } = await service
    .from('public_forms')
    .select('id, slug, title, schema, schema_version, version, closes_at, max_responses')
    .eq('slug', slug)
    .maybeSingle();
  if (loadError !== null || row === null) return redirectBack(slug, 'tidak_tersedia');
  const pub = row as unknown as PublicFormRow;

  const parsed = parsePublicSchema(pub);
  if (parsed === null) return redirectBack(slug, 'tidak_tersedia');

  // Kuota: hitung responses lewat service role (anon tidak boleh).
  const { count, error: quotaError } = await service
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', pub.id);
  if (quotaError !== null) return redirectBack(slug, 'kirim');
  const state = closedState(pub, count ?? 0);
  if (state.closed) return redirectBack(slug, state.code);

  const answers = validateSubmit(parsed, form);
  if (!answers.ok) return redirectBack(slug, answers.code);

  const rawToken = form.get('client_token');
  const token =
    typeof rawToken === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(rawToken) ? rawToken : null;
  if (token !== null && alreadySeen(ip, token, Date.now())) {
    // Kiriman ulang (double-click/refresh) → perlakukan sebagai sukses.
    return new Response(null, { status: 303, headers: { Location: `/f/${slug}/terima-kasih` } });
  }

  const { error: insertError } = await service.from('responses').insert({
    form_id: pub.id,
    form_version: pub.version,
    answers: answers.answers,
  });
  if (insertError !== null) return redirectBack(slug, 'kirim');
  if (token !== null) remember(ip, token, Date.now());

  return new Response(null, { status: 303, headers: { Location: `/f/${slug}/terima-kasih` } });
};
