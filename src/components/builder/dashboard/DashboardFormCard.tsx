/**
 * DashboardFormCard.tsx — kartu formulir tanpa garis: status, progres, dan aksi.
 * Judul kartu langsung menuju builder.
 */
import { useEffect, useRef, useState } from 'react';
import type { FormRow } from '../dashboardForms';
import { statusMeta } from './types';
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

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  const meta = statusMeta(form.status);
  const isCopied = copiedSlug === form.slug;
  const isPublished = form.status === 'published';
  const progress = calculateProgress(form.responses, form.maxResponses);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  return (
    <article className="db-form-card">
      <div className="db-fc-head">
        <div className="db-fc-info">
          <h3 className="db-fc-title">
            <a href={`/dashboard/${form.id}`}>{form.title}</a>
          </h3>
          <div className="db-fc-meta">
            <code>/f/{form.slug}</code>
            <span>Diperbarui {formatDate(form.updatedAt)}</span>
          </div>
        </div>
        <span className={`db-status db-status--${meta.tone}`} title={meta.desc}>
          {meta.short}
        </span>
      </div>

      <div className="db-fc-progress">
        {progress.hasQuota && (
          <div className="db-fc-progress-track" aria-hidden="true">
            <div
              className="db-fc-progress-fill"
              style={{ width: `${Math.max(2, progress.ratio)}%` }}
            />
          </div>
        )}
        <span className="db-fc-progress-text">
          {progress.hasQuota
            ? `${form.responses} / ${form.maxResponses} respons`
            : `${form.responses} respons`}
        </span>
      </div>

      <div className="db-fc-actions">
        <a href={`/dashboard/${form.id}`} className="db-btn db-btn--primary db-btn--sm">
          Edit
        </a>
        <a
          href={`/dashboard/${form.id}/respons`}
          className="db-btn db-btn--ghost db-btn--sm"
        >
          Jawaban
        </a>
        {isPublished && (
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="db-btn db-btn--ghost db-btn--sm"
            aria-label={`Buka ${form.title} di tab baru`}
          >
            Buka
          </a>
        )}
        <button
          type="button"
          className="db-btn db-btn--ghost db-btn--sm"
          onClick={() => onCopyLink(form.slug)}
          title="Salin tautan form"
          aria-label={isCopied ? `Tautan ${form.title} tersalin` : `Salin tautan ${form.title}`}
        >
          {isCopied ? 'Tersalin' : 'Salin link'}
        </button>

        <div className="db-fc-menu" ref={menuRef}>
          <button
            type="button"
            className="db-icon-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Aksi lainnya"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="db-dropdown" role="menu" aria-label={`Aksi untuk ${form.title}`}>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(form);
                }}
                disabled={isBusy}
                role="menuitem"
              >
                Duplikat
              </button>
              <a
                href={`/api/forms/${form.id}/export.csv`}
                onClick={() => setMenuOpen(false)}
                role="menuitem"
              >
                Unduh CSV
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
                  Tutup form
                </button>
              )}
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
                Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
