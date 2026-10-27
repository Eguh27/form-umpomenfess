import React, { useState } from 'react';
import type { ReportAction, ReportItem, ReportStatus } from '../../lib/forms/reports';
import { AdminReportCard } from './AdminReportCard';

interface Props {
  initialReports: ReportItem[];
}

export const AdminReports: React.FC<Props> = ({ initialReports }) => {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const dismissedCount = reports.filter((r) => r.status === 'dismissed').length;

  const filtered = reports.filter((r) => (filter === 'all' ? true : r.status === filter));

  const handleAction = async (id: string, action: ReportAction, notes?: string) => {
    setLoadingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/reports/${id}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Gagal memproses aksi laporan.');
      }

      setReports((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const nextStatus: ReportStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
          return {
            ...r,
            status: nextStatus,
            actionTaken: action === 'close_form' ? 'form_closed' : action,
            resolvedAt: new Date().toISOString(),
            notes: notes?.trim() || r.notes,
            form: r.form && action === 'close_form' ? { ...r.form, status: 'closed' } : r.form,
          };
        }),
      );

      setFeedback({
        type: 'ok',
        message:
          action === 'close_form'
            ? 'Form berhasil ditutup dan laporan diselesaikan.'
            : action === 'resolve'
              ? 'Laporan berhasil ditandai selesai.'
              : 'Laporan telah diabaikan.',
      });
    } catch (err) {
      setFeedback({ type: 'err', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {feedback && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '12px',
            background: feedback.type === 'ok' ? 'rgba(47,114,99,0.12)' : 'rgba(232,96,76,0.12)',
            color: feedback.type === 'ok' ? 'var(--brand)' : 'var(--danger)',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Filter Tabs */}
      <nav style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} aria-label="Filter status laporan">
        <button
          type="button"
          className={`btn btn--sm ${filter === 'pending' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setFilter('pending')}
        >
          Perlu Ditinjau ({pendingCount})
        </button>
        <button
          type="button"
          className={`btn btn--sm ${filter === 'resolved' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setFilter('resolved')}
        >
          Selesai ({resolvedCount})
        </button>
        <button
          type="button"
          className={`btn btn--sm ${filter === 'dismissed' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setFilter('dismissed')}
        >
          Diabaikan ({dismissedCount})
        </button>
        <button
          type="button"
          className={`btn btn--sm ${filter === 'all' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setFilter('all')}
        >
          Semua ({reports.length})
        </button>
      </nav>

      {/* List Laporan */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada laporan pada kategori ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {filtered.map((item) => (
            <AdminReportCard
              key={item.id}
              report={item}
              loading={loadingId === item.id}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
};
