import React, { useState } from 'react';
import type { ReportItem, ReportAction } from '../../lib/forms/reports';

interface Props {
  report: ReportItem;
  loading: boolean;
  onAction: (id: string, action: ReportAction, notes?: string) => Promise<void>;
}

export const AdminReportCard: React.FC<Props> = ({ report, loading, onAction }) => {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const isPending = report.status === 'pending';
  const badgeClass =
    report.status === 'pending'
      ? 'badge--warning'
      : report.status === 'resolved'
        ? 'badge--success'
        : 'badge--neutral';

  const badgeLabel =
    report.status === 'pending'
      ? 'Perlu Ditinjau'
      : report.status === 'resolved'
        ? report.actionTaken === 'form_closed'
          ? 'Form Ditutup'
          : 'Selesai'
        : 'Diabaikan';

  const formattedDate = new Date(report.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="card" style={{ padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-3)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{formattedDate}</span>
        </div>
        {report.form && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Status Form: <strong>{report.form.status}</strong>
          </span>
        )}
      </header>

      {/* Info Form Terlapor */}
      <div style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.03))', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
          {report.form?.title ?? '(Form tidak ditemukan atau telah dihapus)'}
        </p>
        {report.form?.slug && (
          <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
            <a href={`/f/${report.form.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>
              Buka /f/{report.form.slug} ↗
            </a>
          </div>
        )}
      </div>

      {/* Alasan Laporan - Aman dari XSS (teks biasa) */}
      <div>
        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Alasan Pelaporan:
        </p>
        <blockquote style={{ margin: 0, padding: '10px 14px', background: 'var(--card-bg, #fff)', borderLeft: '4px solid var(--danger, #e8604c)', borderRadius: '4px', fontSize: '0.95rem' }}>
          {report.reason}
        </blockquote>
      </div>

      {report.notes && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>Catatan Admin:</strong> {report.notes}
        </p>
      )}

      {/* Aksi Moderasi */}
      {isPending && (
        <footer style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px', display: 'grid', gap: '8px' }}>
          {showNotes && (
            <input
              type="text"
              className="input"
              placeholder="Catatan moderasi (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={loading}
              onClick={() => onAction(report.id, 'close_form', notes)}
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            >
              🛑 Tutup Form & Selesaikan
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={loading}
              onClick={() => onAction(report.id, 'resolve', notes)}
            >
              ✓ Selesaikan Laporan
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={loading}
              onClick={() => onAction(report.id, 'dismiss', notes)}
            >
              Abaikan
            </button>
            {!showNotes && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowNotes(true)}
                style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
              >
                + Tambah Catatan
              </button>
            )}
          </div>
        </footer>
      )}
    </article>
  );
};
