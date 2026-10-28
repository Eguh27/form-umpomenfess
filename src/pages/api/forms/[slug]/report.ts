/**
 * POST /api/forms/[slug]/report — tombol "Laporkan" (T-50/T-52).
 *
 * Selalu memakai klien anon tanpa cookie sesi: pelaporan adalah aksi publik,
 * dan policy RLS `reports_insert_any_published` menegakkan "form harus
 * published" via view. Dengan role anon, user yang login tidak memakai policy
 * baca `authenticated` (lihat catatan migrasi 20261028104500). Alasan ≤ 1000
 * huruf, di-trim.
 */
import { redirectBack } from '../../../../lib/forms/endpoints';
import { checkAndRecord, ipFromHeaders } from '../../../../lib/forms/rateLimit';
import { createAnonClient, getEnvConfig } from '../../../../lib/auth/supabase';

const REASON_MAX = 1000;

export const POST = async (ctx: {
  params: Record<string, string | undefined>;
  request: Request;
}): Promise<Response> => {
  const slug = ctx.params.slug ?? '';
  const ip = ipFromHeaders(ctx.request.headers);
  if (!(await checkAndRecord(ip, Date.now(), 5))) return redirectBack(slug, 'lapor');

  const config = getEnvConfig();
  if (config === null) return redirectBack(slug, 'lapor');
  const supabase = createAnonClient(config);

  const data = await ctx.request.formData();
  const raw = data.get('reason');
  const reason = typeof raw === 'string' && raw.length <= REASON_MAX ? raw.trim() : null;
  if (reason === null || reason === '') return redirectBack(slug, 'lapor');

  // form_id di-resolve dari slug lewat view publik (hanya id yang diambil);
  // RLS policy reports_insert_any_published menolak bila tidak published.
  const { data: row, error: loadError } = await supabase
    .from('public_forms')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (loadError !== null || row === null) return redirectBack(slug, 'lapor');

  const { error } = await supabase
    .from('reports')
    .insert({ form_id: row.id, reason });
  if (error !== null) return redirectBack(slug, 'lapor');

  return redirectBack(slug, 'lapor_ok');
};
