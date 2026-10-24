/**
 * DashboardCreateModal.tsx — dialog dua jalur: template atau lembar kosong.
 * Tanpa border, gradien, atau pemisah; fokus terkurung dan Escape menutup.
 */
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBlank: (title: string) => void;
  onGoToTemplates: () => void;
  isBusy: boolean;
}

/** `icon` adalah kunci ikon, bukan emoji; tidak dirender di UI. */
export const TITLE_SUGGESTIONS = [
  { icon: 'graduation', title: 'Kuesioner Penelitian Skripsi', category: 'Skripsi' },
  { icon: 'clipboard', title: 'Formulir Pendaftaran Kegiatan', category: 'Pendaftaran' },
  { icon: 'star', title: 'Survei Kepuasan Mahasiswa', category: 'Evaluasi' },
  { icon: 'chat', title: 'Kotak Masukan & Saran', category: 'Feedback' },
  { icon: 'trophy', title: 'Pendaftaran Lomba Kampus', category: 'Kompetisi' },
] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function DashboardCreateModal({
  isOpen,
  onClose,
  onCreateBlank,
  onGoToTemplates,
  isBusy,
}: CreateModalProps) {
  const [title, setTitle] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCreateBlank(title.trim());
  };

  return (
    <div
      className="db-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <div
        className="db-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="db-create-title"
        ref={modalRef}
      >
        <div className="db-modal-head">
          <div>
            <h2 id="db-create-title">Buat formulir</h2>
            <p className="db-muted">Pilih titik mulai yang paling nyaman.</p>
          </div>
          <button
            type="button"
            className="db-icon-btn"
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            ×
          </button>
        </div>

        <section className="db-modal-section" aria-labelledby="db-template-choice">
          <h3 id="db-template-choice">Mulai dari template</h3>
          <p className="db-muted">
            Pertanyaan inti sudah tersusun. Kamu bisa menyesuaikannya setelah dibuat.
          </p>
          <button
            type="button"
            className="db-btn db-btn--soft"
            onClick={onGoToTemplates}
            disabled={isBusy}
          >
            Lihat template
          </button>
        </section>

        <form className="db-modal-section" onSubmit={handleSubmit}>
          <h3>Mulai dari kosong</h3>
          <label className="sr-only" htmlFor="db-form-title">
            Judul formulir
          </label>
          <input
            id="db-form-title"
            ref={inputRef}
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Judul formulir"
            disabled={isBusy}
          />

          <div className="db-suggestions">
            <span className="db-muted">Contoh judul</span>
            {TITLE_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.title}
                type="button"
                className="db-suggestion"
                onClick={() => setTitle(suggestion.title)}
                disabled={isBusy}
              >
                {suggestion.title}
              </button>
            ))}
          </div>

          <div className="db-modal-actions">
            <button type="button" className="db-btn db-btn--ghost" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="db-btn db-btn--primary" disabled={isBusy}>
              Buat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
