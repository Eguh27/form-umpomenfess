/**
 * GET /api/forms/[id]/export.xlsx — unduh respons format spreadsheet Excel (.xlsx) (T-86).
 *
 * Otorisasi: RLS forms_select_own via klien cookie-user — form milik orang
 * lain / anon / id salah → row null → 404 prosaik (tidak membocorkan ada/tidak).
 */
import { payloadTooLarge, jsonError } from '../../../../lib/forms/endpoints';
import { buildXlsx, xlsxFilename } from '../../../../lib/forms/xlsx';
import { parseFormSchema, type FormAnswerValue } from '../../../../lib/forms/schema';
import { LIMITS } from '../../../../lib/config/limits';
import { createBufferedClient, getEnvConfig } from '../../../../lib/auth/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResponseRow {
  created_at: string;
  answers: Record<string, FormAnswerValue>;
}

export const GET = async (ctx: { params: Record<string, string | undefined>; request: Request }): Promise<Response> => {
  const id = ctx.params.id ?? '';
  if (!UUID_RE.test(id)) return jsonError('form_tidak_tersedia', 404);
  if (await payloadTooLarge(ctx.request)) return jsonError('payload_besar', 400);

  const config = getEnvConfig();
  if (config === null) return jsonError('backend_belum_konfigurasi', 503);
  const { supabase, flush } = createBufferedClient(ctx.request, config);

  // RLS yang memilah: hanya pemilik yang melihat barisnya sendiri.
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('slug, schema')
    .eq('id', id)
    .maybeSingle();
  if (formError !== null || form === null) return flush(jsonError('form_tidak_tersedia', 404));

  const parsed = parseFormSchema((form as { schema: unknown }).schema);
  if (!parsed.ok) return flush(jsonError('schema_rusak', 500));

  const { data: rows, error: respError } = await supabase
    .from('responses')
    .select('created_at, answers')
    .eq('form_id', id)
    .order('created_at', { ascending: true })
    .limit(LIMITS.maxResponsesPerForm);
  if (respError !== null) return flush(jsonError('respons_gagal_dimuat', 500));

  const list = (rows ?? []) as unknown as ResponseRow[];
  const bytes = await buildXlsx(parsed.data, list.map((r) => ({ createdAt: r.created_at, answers: r.answers ?? {} })));

  const slug = (form as { slug: string }).slug ?? 'form';
  return flush(new Response(bytes.buffer as ArrayBuffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${xlsxFilename(slug)}"`,
      'cache-control': 'no-store',
    },
  }));
};
