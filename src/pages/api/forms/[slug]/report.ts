/**
 * POST /api/forms/[slug]/report — tombol "Laporkan" (T-50/T-52).
 *
 * Semua lewat klien cookie-user supaya RLS `reports_insert_any_published`
 * yang menegakkan "form harus published" (EXISTS via view) — tidak butuh
 * service role. Alasan ≤ 1000 huruf, di-trim. Setiap jalur keluar memanggil
 * flush() agar cookie refresh Supabase tetap tertempel di Response.
 */
import { redirectBack } from '../../../../lib/forms/endpoints';
import { checkAndRecord, ipFromHeaders } from '../../../../lib/forms/rateLimit';
import { createBufferedClient, getEnvConfig } from '../../../../lib/auth/supabase';

const REASON_MAX = 1000;

export const POST = async (ctx: {
  params: Record<string, string | undefined>;
  request: Request;
}): Promise<Response> => {
  const slug = ctx.params.slug ?? '';
  const ip = ipFromHeaders(ctx.request.headers);
  if (!checkAndRecord(ip, Date.now(), 5)) return redirectBack(slug, 'lapor');

  const config = getEnvConfig();
  if (config === null) return redirectBack(slug, 'lapor');
  const { supabase, flush } = createBufferedClient(ctx.request, config);

  const data = await ctx.request.formData();
  const raw = data.get('reason');
  const reason = typeof raw === 'string' && raw.length <= REASON_MAX ? raw.trim() : null;
  if (reason === null || reason === '') return flush(redirectBack(slug, 'lapor'));

  // form_id di-resolve dari slug lewat view publik (hanya id yang diambil);
  // RLS policy reports_insert_any_published menolak bila tidak published.
  const { data: row, error: loadError } = await supabase
    .from('public_forms')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (loadError !== null || row === null) return flush(redirectBack(slug, 'lapor'));

  const { error } = await supabase
    .from('reports')
    .insert({ form_id: row.id, reason });
  if (error !== null) return flush(redirectBack(slug, 'lapor'));

  return flush(redirectBack(slug, 'lapor_ok'));
};
