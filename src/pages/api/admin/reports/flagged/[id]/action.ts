/**
 * POST /api/admin/reports/flagged/[id]/action — Aksi moderasi form ter-flag (Epic B, Zona C).
 * Akses khusus admin: close_form atau unflag.
 */
import { jsonError, jsonOk } from '../../../../../../lib/forms/endpoints';
import { isAdmin } from '../../../../../../lib/auth/admin';
import { getSupabaseService } from '../../../../../../lib/forms/service';
import { applyFlaggedFormAction } from '../../../../../../lib/forms/reports';

const VALID_ACTIONS: Set<string> = new Set(['close_form', 'unflag']);

export const POST = async (ctx: {
  params: Record<string, string | undefined>;
  locals: { user?: { id: string; email?: string | null; app_metadata?: { role?: unknown; [k: string]: unknown } | null } | null };
  request: Request;
}): Promise<Response> => {
  const user = ctx.locals?.user ?? null;
  if (!user) return jsonError('harus_login', 401);
  if (!isAdmin(user)) return jsonError('akses_ditolak', 403);

  const formId = ctx.params.id;
  if (!formId || typeof formId !== 'string') {
    return jsonError('id_tidak_valid', 400);
  }

  const contentType = ctx.request.headers.get('content-type') ?? '';
  let action: 'close_form' | 'unflag' | null = null;
  let notes: string | undefined = undefined;
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try {
      const body = (await ctx.request.json()) as Record<string, unknown>;
      if (typeof body.action === 'string' && VALID_ACTIONS.has(body.action)) {
        action = body.action as 'close_form' | 'unflag';
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
        action = rawAction as 'close_form' | 'unflag';
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

  const res = await applyFlaggedFormAction(service, {
    formId,
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
