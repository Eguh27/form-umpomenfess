/**
 * DashboardFormCard.tsx — Kartu form individual ala E-Tutor (Zona B).
 * Menyediakan tombol aksi yang jelas dengan teks ramah pemula (bukan simbol abstrak).
 */
import { useState, useRef, useEffect } from 'react';
import type { FormRow } from '../dashboardForms';
import { STATUS_LABELS } from './types';
import { calculateProgress } from './templateHelper';

interface FormCardProps {
  form: FormRow;
  onCopyLink: (slug: string) => void;
  copiedSlug: string | null;
  onDuplicate: (form: FormRow) => void;
  onCloseForm: (form: FormRow) => void;
  onDeleteForm: (form: FormRow) => void;
  isBusy: boolean;
}

export default function DashboardFormCard({
  form,
  onCopyLink,
  copiedSlug,
  onDuplicate,
  onCloseForm,
  onDeleteForm,
  isBusy,
}: FormCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  const statusMeta = STATUS_LABELS[form.status] ?? {
    label: form.status,
    badgeClass: 'status-closed',
    desc: 'Status formulir',
  };

  const isCopied = copiedSlug === form.slug;
  const isPublished = form.status === 'published';
  const progress = calculateProgress(form.responses, form.maxResponses);

  return (
    <article className="db-form-card" data-testid={`form-card-${form.id}`}>
      {/* Bagian Atas: Ikon status, Judul & Tautan Publik */}
      <div className="db-fc-top">
        <div className={`db-fc-icon icon-${form.status}`} aria-hidden="true">
          {form.status === 'published' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : form.status === 'draft' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="10" y1="15" x2="10" y2="9" />
              <line x1="14" y1="15" x2="14" y2="9" />
            </svg>
          )}
        </div>

        <div className="db-fc-info">
          <h3 className="db-fc-title">
            <a href={`/dashboard/${form.id}`} title="Buka editor form">
              {form.title}
            </a>
          </h3>

          <div className="db-fc-slug-row">
            <span>Tautan:</span>
            <code>/f/{form.slug}</code>
            {isPublished && (
              <a
                href={`/f/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                title="Buka form publik di tab baru"
                style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 700 }}
              >
                ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Baris Status & Indikator Respons */}
      <div className="db-fc-meta-row">
        <span className={`db-fc-status ${statusMeta.badgeClass}`} title={statusMeta.desc}>
          {statusMeta.label}
        </span>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Diperbarui {new Date(form.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Indikator Visual Progres Respons */}
      <div className="db-fc-progress-wrap">
        {progress.hasQuota ? (
          <>
            <div className="db-fc-progress-bar">
              <div className="db-fc-progress-fill" style={{ width: `${Math.max(4, progress.ratio)}%` }} />
            </div>
            <span className="db-fc-progress-text">
              📊 {progress.label}
            </span>
          </>
        ) : (
          <span className="db-fc-progress-text" style={{ width: '100%' }}>
            📊 {progress.label}
          </span>
        )}
      </div>

      {/* Tombol Aksi Ramah Pemula */}
      <div className="db-fc-actions">
        {/* Tombol Edit */}
        <a href={`/dashboard/${form.id}`} className="db-action-btn db-btn-primary" title="Edit pertanyaan dan tema form">
          ✏️ Edit Form
        </a>

        {/* Tombol Lihat Respons */}
        <a href={`/dashboard/${form.id}/respons`} className="db-action-btn db-btn-secondary" title="Lihat hasil jawaban responden">
          📊 Jawaban ({form.responses})
        </a>

        {/* Tombol Salin Tautan */}
        <button
          type="button"
          className="db-action-btn db-btn-secondary"
          onClick={() => onCopyLink(form.slug)}
          title="Salin tautan formulir untuk dibagikan ke responden"
        >
          {isCopied ? '✓ Tersalin!' : '🔗 Salin Link'}
        </button>

        {/* Menu Pilihan Lainnya (⋯) */}
        <div style={{ position: 'relative', marginLeft: 'auto' }} ref={menuRef}>
          <button
            type="button"
            className="db-action-btn db-btn-ghost"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Pilihan aksi lainnya"
            title="Aksi lainnya"
            style={{ padding: '7px 10px' }}
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="db-dropdown" style={{ right: 0, minWidth: 230 }} role="menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(form);
                }}
                disabled={isBusy}
                role="menuitem"
              >
                <span>⎘</span>
                <div>
                  <strong>Duplikat Form</strong>
                  <small style={{ display: 'block', color: 'var(--text-muted)' }}>Buat salinan baru form ini</small>
                </div>
              </button>

              <a
                href={`/api/forms/${form.id}/export.csv`}
                onClick={() => setMenuOpen(false)}
                role="menuitem"
              >
                <span>📥</span>
                <div>
                  <strong>Unduh Jawaban (Excel / CSV)</strong>
                  <small style={{ display: 'block', color: 'var(--text-muted)' }}>Format file untuk Excel & Spreadsheet</small>
                </div>
              </a>

              {isPublished && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onCloseForm(form);
                  }}
                  disabled={isBusy}
                  role="menuitem"
                >
                  <span>⏸️</span>
                  <div>
                    <strong>Tutup Penerimaan</strong>
                    <small style={{ display: 'block', color: 'var(--text-muted)' }}>Hentikan pengisian baru</small>
                  </div>
                </button>
              )}

              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteForm(form);
                }}
                disabled={isBusy}
                role="menuitem"
              >
                <span>🗑️</span>
                <div>
                  <strong>Hapus Form</strong>
                  <small style={{ display: 'block', color: 'var(--danger)' }}>Pindahkan ke kotak sampah</small>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
