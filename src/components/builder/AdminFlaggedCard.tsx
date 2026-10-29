import React, { useState } from 'react';
import type { FlaggedFormItem } from '../../lib/forms/reports';

interface Props {
  form: FlaggedFormItem;
  loading: boolean;
  onAction: (formId: string, action: 'close_form' | 'unflag', notes?: string) => Promise<void>;
}

export const AdminFlaggedCard: React.FC<Props> = ({ form, loading, onAction }) => {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const formattedDate = form.lastFlaggedAt
    ? new Date(form.lastFlaggedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <article
      className="card"
      style={{
        padding: 'var(--space-4)',
        display: 'grid',
        gap: 'var(--space-3)',
        borderLeft: '4px solid var(--danger)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="badge badge--danger">
              ⚠️ {form.reportCount} {form.reportCount === 1 ? 'Laporan' : 'Laporan'}
            </span>
            <span
              className={`badge ${form.status === 'published' ? 'badge--warning' : 'badge--neutral'}`}
            >
              Status: {form.status === 'published' ? 'Publik (Aktif)' : form.status}
            </span>
            {formattedDate && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Terakhir: {formattedDate}
              </span>
            )}
          </div>
          <h3 style={{ margin: '8px 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
            {form.title || '(Tanpa Judul)'}
          </h3>
        </div>

        {form.slug && (
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn--sm"
            style={{ fontSize: '0.85rem' }}
          >
            Buka Form ↗
          </a>
        )}
      </header>

      {/* Ringkasan Alasan Pelaporan */}
      <div
        style={{
          background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
          padding: '12px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Alasan Pelaporan Responden ({form.reasons.length}):
        </p>
        {form.reasons.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Tidak ada rincian alasan teks yang disertakan.
          </p>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              display: 'grid',
              gap: '6px',
              fontSize: '0.9rem',
            }}
          >
            {form.reasons.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span>{r.reason}</span>{' '}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ({new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})
                </span>
              </li>
            ))}
            {form.reasons.length > 5 && (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                +{form.reasons.length - 5} laporan lainnya...
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Aksi Moderasi Form */}
      <footer
        style={{
          borderTop: '1px dashed var(--border)',
          paddingTop: '12px',
          display: 'grid',
          gap: '8px',
        }}
      >
        {showNotes && (
          <input
            type="text"
            className="input"
            placeholder="Catatan moderasi admin (opsional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={loading}
            onClick={() => onAction(form.id, 'close_form', notes)}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 600 }}
          >
            🛑 Tutup Form Sekarang
          </button>

          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={loading}
            onClick={() => onAction(form.id, 'unflag', notes)}
          >
            🛡️ Bersihkan Flag (Abaikan)
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
    </article>
  );
};
