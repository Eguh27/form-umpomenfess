/**
 * src/lib/forms/reports.ts — Model data & operasi moderasi laporan (Epic B, Zona C).
 * Digunakan oleh endpoint server & halaman moderasi admin.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportAction = 'close_form' | 'resolve' | 'dismiss';

export interface FormSummary {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'closed';
  ownerId?: string | null;
}

export interface ReportItem {
  id: string;
  formId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  actionTaken: string | null;
  notes: string | null;
  form: FormSummary | null;
}

export async function listReports(
  supabase: SupabaseClient,
  filter: { status?: ReportStatus | 'all'; limit?: number } = {},
): Promise<ReportItem[]> {
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 100);
  let query = supabase
    .from('reports')
    .select(`
      id, form_id, reason, created_at,
      status, resolved_at, resolved_by, action_taken, notes,
      forms ( id, title, slug, status, owner_id )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];

  return data.map((row: Record<string, unknown>) => {
    const rawForm = row.forms as Record<string, unknown> | null | undefined;
    const form: FormSummary | null =
      rawForm && typeof rawForm === 'object'
        ? {
            id: String(rawForm.id ?? ''),
            title: String(rawForm.title ?? 'Tanpa judul'),
            slug: String(rawForm.slug ?? ''),
            status: (rawForm.status as FormSummary['status']) ?? 'draft',
            ownerId: rawForm.owner_id ? String(rawForm.owner_id) : null,
          }
        : null;

    return {
      id: String(row.id),
      formId: String(row.form_id),
      reason: String(row.reason ?? ''),
      status: (row.status ?? 'pending') as ReportStatus,
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
      resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
      actionTaken: row.action_taken ? String(row.action_taken) : null,
      notes: row.notes ? String(row.notes) : null,
      form,
    };
  });
}

export async function countPendingReports(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error || typeof count !== 'number') return 0;
  return count;
}

export async function applyReportAction(
  supabase: SupabaseClient,
  args: {
    reportId: string;
    action: ReportAction;
    adminUserId?: string | null;
    notes?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { reportId, action, adminUserId, notes } = args;

  if (action === 'close_form') {
    const { data: rep, error: getErr } = await supabase
      .from('reports')
      .select('form_id')
      .eq('id', reportId)
      .maybeSingle();

    if (getErr || !rep) return { ok: false, error: 'Laporan tidak ditemukan.' };

    const { error: formErr } = await supabase
      .from('forms')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', rep.form_id);

    if (formErr) return { ok: false, error: 'Gagal menutup form.' };
  }

  const newStatus: ReportStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
  const actionTaken = action === 'close_form' ? 'form_closed' : action;

  const { error: repErr } = await supabase
    .from('reports')
    .update({
      status: newStatus,
      action_taken: actionTaken,
      resolved_at: new Date().toISOString(),
      resolved_by: adminUserId ?? null,
      notes: notes?.trim() || null,
    })
    .eq('id', reportId);

  if (repErr) return { ok: false, error: 'Gagal memperbarui status laporan.' };
  return { ok: true };
}
