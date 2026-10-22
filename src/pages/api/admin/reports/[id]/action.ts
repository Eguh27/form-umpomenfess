/**
 * POST /api/admin/reports/[id]/action — Aksi moderasi laporan oleh admin (Epic B, Zona C).
 * Akses khusus admin: resolve, dismiss, atau close_form.
 */
import { jsonError, jsonOk } from '../../../../../lib/forms/endpoints';
import { isAdmin } from '../../../../../lib/auth/admin';
import { getSupabaseService } from '../../../../../lib/forms/service';
import { applyReportAction, type ReportAction } from '../../../../../lib/forms/reports';

const VALID_ACTIONS: Set<string> = new Set(['close_form', 'resolve', 'dismiss']);

export const POST = async (ctx: {
  params: Record<string, string | undefined>;
  locals: { user?: { id: string; email?: string | null; app_metadata?: { role?: unknown; [k: string]: unknown } | null } | null };
  request: Request;
}): Promise<Response> => {
  const user = ctx.locals?.user ?? null;
  if (!user) return jsonError('harus_login', 401);
  if (!isAdmin(user)) return jsonError('akses_ditolak', 403);

  const reportId = ctx.params.id;
  if (!reportId || typeof reportId !== 'string') {
    return jsonError('id_tidak_valid', 400);
  }

  const contentType = ctx.request.headers.get('content-type') ?? '';
  let action: ReportAction | null = null;
  let notes: string | undefined = undefined;
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try {
      const body = (await ctx.request.json()) as Record<string, unknown>;
      if (typeof body.action === 'string' && VALID_ACTIONS.has(body.action)) {
        action = body.action as ReportAction;
      }
      if (typeof body.notes === 'string') {
        notes = body.notes.slice(0, 500);
      }
    } catch {
      return jsonError('payload_tidak_valid', 400);
    }
  } else {
    try {
      const formData = await ctx.request.formData();
      const rawAction = formData.get('action');
      const rawNotes = formData.get('notes');
      if (typeof rawAction === 'string' && VALID_ACTIONS.has(rawAction)) {
        action = rawAction as ReportAction;
      }
      if (typeof rawNotes === 'string') {
        notes = rawNotes.slice(0, 500);
      }
    } catch {
      return jsonError('payload_tidak_valid', 400);
    }
  }

  if (!action) return jsonError('aksi_tidak_valid', 400);

  const service = getSupabaseService();
  if (!service) return jsonError('backend_belum_konfigurasi', 503);

  const res = await applyReportAction(service, {
    reportId,
    action,
    adminUserId: user.id,
    notes,
  });

  if (!res.ok) {
    return isJson
      ? jsonError(res.error ?? 'gagal_memproses', 400)
      : new Response(null, { status: 303, headers: { Location: '/dashboard/admin/laporan?err=gagal' } });
  }

  if (isJson) {
    return jsonOk({ ok: true, action });
  }
  return new Response(null, { status: 303, headers: { Location: '/dashboard/admin/laporan?ok=1' } });
};
