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
import {
  formDataTooLarge,
  payloadTooLarge,
  redirectBack,
  redirectThanks,
  jsonError,
} from '../../../../lib/forms/endpoints';
import { getSupabaseService } from '../../../../lib/forms/service';
import { verifyTurnstile } from '../../../../lib/forms/turnstile';
import { checkAndRecord, ipFromHeaders } from '../../../../lib/forms/rateLimit';
import {
  closedState,
  parsePublicSchema,
  validateSubmit,
  type PublicFormRow,
} from '../../../../lib/forms/publicForm';
import { tryGuardedInsert } from '../../../../lib/forms/guardedInsert';

/** idempotensi lembut: `${ip}:${token}` → waktu terakhir terlihat. */
const seen = new Map<string, number>();
const seenKeys: string[] = [];
const SEEN_MAX = 5000;
const NONCE_TTL = 5 * 60_000;

function alreadySeen(ip: string, token: string, now: number): boolean {
  const key = `${ip}:${token}`;
  const last = seen.get(key);
  return last !== undefined && now - last < NONCE_TTL;
}

/** R4: evict FIFO — token sah lain tidak dibuang bersama (bukan clear massal). */
function remember(ip: string, token: string, now: number): void {
  const key = `${ip}:${token}`;
  seen.set(key, now);
  seenKeys.push(key);
  while (seenKeys.length > SEEN_MAX) {
    const victim = seenKeys.shift();
    if (victim !== undefined) seen.delete(victim);
  }
}

export const POST = async (ctx: { params: Record<string, string | undefined>; request: Request }): Promise<Response> => {
  const slug = ctx.params.slug ?? '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return jsonError('form_tidak_tersedia', 404);

  if (await payloadTooLarge(ctx.request)) return jsonError('payload_besar', 413);

  const form = await ctx.request.formData();
  // S3: header content-length bisa dipalsukan (chunked); ukur isi sebenarnya.
  if (await formDataTooLarge(form)) return jsonError('payload_besar', 413);

  const ip = ipFromHeaders(ctx.request.headers);
  if (!checkAndRecord(ip)) return redirectBack(slug, 'ratelimit');

  // R2b: cek replay SEBELUM captcha — token Turnstile single-use membuat
  // klik kedua gagal di captcha padahal jawaban pertama sudah masuk. Replay
  // (token sudah terpakai sukses) berhenti di sini TANPA efek samping; bukan
  // jalur bypass: request pertama dengan token itu selalu diperiksa penuh.
  const rawToken = form.get('client_token');
  const token =
    typeof rawToken === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(rawToken) ? rawToken : null;
  if (token !== null && alreadySeen(ip, token, Date.now())) {
    return redirectThanks(slug);
  }

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

  const answers = validateSubmit(parsed, form);
  if (!answers.ok) return redirectBack(slug, answers.code);

  const guarded = await tryGuardedInsert(service, pub, answers.answers, token);
  if (guarded.ok === true) {
    if (token !== null) remember(ip, token, Date.now());
    return redirectThanks(slug);
  }
  switch (guarded.reason) {
    case 'duplikat':
      return redirectThanks(slug);
    case 'sudah_tutup':
    case 'penuh':
      return redirectBack(slug, guarded.reason);
    case 'form_tidak_tersedia':
      return redirectBack(slug, 'tidak_tersedia');
    case 'backend_belum_siap':
      break; // rpc belum dipush → fallback legacy di bawah
    default:
      return redirectBack(slug, 'kirim');
  }
  // FALLBACK legacy (migrasi submit_guard.sql belum dijalankan manusia):
  // count → cek tutup → insert. Sisa window TOCTOU kecil diterima MVP.
  const { count, error: quotaError } = await service
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('form_id', pub.id);
  if (quotaError !== null) return redirectBack(slug, 'kirim');
  const state = closedState(pub, count ?? 0);
  if (state.closed) return redirectBack(slug, state.code);

  const { error: insertError } = await service.from('responses').insert({
    form_id: pub.id,
    form_version: pub.version,
    answers: answers.answers,
  });
  if (insertError !== null) return redirectBack(slug, 'kirim');
  if (token !== null) remember(ip, token, Date.now());

  return redirectThanks(slug);
};
