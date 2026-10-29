import React, { useState } from 'react';
import type { FlaggedFormItem, ReportAction, ReportItem, ReportStatus } from '../../lib/forms/reports';
import { AdminReportCard } from './AdminReportCard';
import { AdminFlaggedCard } from './AdminFlaggedCard';

interface Props {
  initialReports: ReportItem[];
  initialFlaggedForms?: FlaggedFormItem[];
}

export const AdminReports: React.FC<Props> = ({ initialReports, initialFlaggedForms = [] }) => {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [flaggedForms, setFlaggedForms] = useState<FlaggedFormItem[]>(initialFlaggedForms);
  const [activeTab, setActiveTab] = useState<'flagged' | 'tickets'>(
    initialFlaggedForms.length > 0 ? 'flagged' : 'tickets',
  );
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const dismissedCount = reports.filter((r) => r.status === 'dismissed').length;

  const filteredReports = reports.filter((r) => (filter === 'all' ? true : r.status === filter));

  const handleFlaggedAction = async (formId: string, action: 'close_form' | 'unflag', notes?: string) => {
    setLoadingId(formId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/reports/flagged/${formId}/action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Gagal memproses aksi moderasi form.');
      }

      // Hapus form dari daftar flagged karena status is_flagged telah menjadi false
      setFlaggedForms((prev) => prev.filter((f) => f.id !== formId));

      // Sinkronkan status tiket laporan terkait form tersebut
      setReports((prev) =>
        prev.map((r) => {
          if (r.formId !== formId) return r;
          const nextStatus: ReportStatus = action === 'unflag' ? 'dismissed' : 'resolved';
          return {
            ...r,
            status: nextStatus,
            actionTaken: action === 'close_form' ? 'form_closed' : 'dismissed',
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
            ? 'Form berhasil ditutup dan semua laporan terkait diselesaikan.'
            : 'Flag form berhasil dibersihkan dan laporan diabaikan.',
      });
    } catch (err) {
      setFeedback({ type: 'err', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoadingId(null);
    }
  };

  const handleReportAction = async (id: string, action: ReportAction, notes?: string) => {
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

      const targetReport = reports.find((r) => r.id === id);

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

      // Jika aksi close_form, perbarui juga state form jika sedang ada di list flagged
      if (action === 'close_form' && targetReport?.formId) {
        setFlaggedForms((prev) => prev.filter((f) => f.id !== targetReport.formId));
      }

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

      {/* Main Mode Switcher: Form Ter-flag vs Tiket Laporan */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'flagged' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('flagged')}
          style={{ fontWeight: 600 }}
        >
          🚨 Form Ter-flag ({flaggedForms.length})
        </button>
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'tickets' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('tickets')}
          style={{ fontWeight: 600 }}
        >
          📋 Semua Tiket Laporan ({pendingCount} pending)
        </button>
      </div>

      {activeTab === 'flagged' ? (
        /* Tab 1: Form Ter-flag */
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {flaggedForms.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>
                🎉 Tidak ada form yang ter-flag saat ini.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.88rem' }}>
                Form yang dilaporkan responden akan otomatis muncul di sini untuk peninjauan admin.
              </p>
            </div>
          ) : (
            flaggedForms.map((item) => (
              <AdminFlaggedCard
                key={item.id}
                form={item}
                loading={loadingId === item.id}
                onAction={handleFlaggedAction}
              />
            ))
          )}
        </div>
      ) : (
        /* Tab 2: Tiket Laporan Individu */
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <nav
            style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
            aria-label="Filter status laporan"
          >
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

          {filteredReports.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 'var(--space-6)',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada tiket laporan pada kategori ini.</p>
            </div>
          ) : (
            filteredReports.map((item) => (
              <AdminReportCard
                key={item.id}
                report={item}
                loading={loadingId === item.id}
                onAction={handleReportAction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
