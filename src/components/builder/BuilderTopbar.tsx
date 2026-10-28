/**
 * BuilderTopbar.tsx — topbar presentational builder (T-73).
 * Semua state dan efek tetap di Editor; komponen ini hanya menampilkan
 * judul, status, status simpan, undo/redo, tautan respons, dan Publikasikan.
 */
import { useRef } from 'react';
import { statusMeta } from './dashboard/types';
import { IconBack, IconExternal, IconRedo, IconRespons, IconUndo } from './builderIcons';

export type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'invalid';

const SAVE_LABEL: Record<SaveState, string> = {
  clean: 'Tersimpan',
  dirty: 'Belum tersimpan',
  saving: 'Menyimpan…',
  saved: 'Tersimpan',
  error: 'Gagal menyimpan',
  invalid: 'Draf belum valid',
};

const SAVE_DANGER: ReadonlySet<SaveState> = new Set(['error', 'invalid']);

function statusLabel(status: string): string {
  const short = statusMeta(status).short;
  return short === 'Draft' ? 'Draf' : short;
}

interface Props {
  title: string;
  status: string;
  version: number;
  saveState: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  onTitleChange: (title: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  formId: string;
  slug: string;
  backHref?: string;
  publishDisabled?: boolean;
  publishDisabledReason?: string;
}

export default function BuilderTopbar({
  title,
  status,
  version,
  saveState,
  canUndo,
  canRedo,
  onTitleChange,
  onUndo,
  onRedo,
  onPublish,
  formId,
  slug,
  backHref = '/dashboard',
  publishDisabled = false,
  publishDisabledReason,
}: Props) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const meta = statusMeta(status);
  const label = statusLabel(status);
  const isPublished = status === 'published';
  const saving = saveState === 'saving';
  const saveDanger = SAVE_DANGER.has(saveState);
  const responsesHref = `/dashboard/${formId}/respons`;
  const liveHref = `/f/${slug}`;

  const closeMenu = () => menuRef.current?.removeAttribute('open');
  const runFromMenu = (action: () => void) => () => {
    action();
    closeMenu();
  };

  const undoButton = (className: string) => (
    <button
      type="button"
      className={className}
      onClick={onUndo}
      disabled={!canUndo}
      aria-label="Urungkan perubahan"
      title="Urungkan"
    >
      <IconUndo />
    </button>
  );

  const redoButton = (className: string) => (
    <button
      type="button"
      className={className}
      onClick={onRedo}
      disabled={!canRedo}
      aria-label="Ulangi perubahan"
      title="Ulangi"
    >
      <IconRedo />
    </button>
  );

  return (
    <header className="b-topbar">
      <a className="b-topbar__back" href={backHref} aria-label="Kembali ke Dashboard">
        <IconBack />
        <span>Dashboard</span>
      </a>

      <div className="b-topbar__title">
        <input
          id="b-form-title"
          className="b-title-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          aria-label="Judul formulir"
          placeholder="Formulir tanpa judul"
          autoComplete="off"
        />
      </div>

      <div className="b-topbar__meta">
        <span className={`b-status b-status--${meta.tone}`} title={meta.desc}>
          {label}
        </span>
        <span className="b-topbar__version">v{version}</span>
      </div>

      <div className="b-topbar__actions b-topbar__actions--desktop">
        <span
          className={`b-topbar__save${saveDanger ? ' is-danger' : ''}`}
          role="status"
          aria-live="polite"
        >
          {SAVE_LABEL[saveState]}
        </span>
        {undoButton('b-iconbtn')}
        {redoButton('b-iconbtn')}
        <a
          className="b-iconbtn"
          href={responsesHref}
          aria-label="Lihat respons"
          title="Respons"
        >
          <IconRespons />
        </a>
        {isPublished && (
          <a
            className="b-iconbtn"
            href={liveHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Lihat form publik"
            title="Lihat form publik"
          >
            <IconExternal />
          </a>
        )}
        <button
          type="button"
          className="b-btn b-btn--publish"
          onClick={onPublish}
          disabled={saving || publishDisabled}
          title={publishDisabled ? publishDisabledReason : undefined}
          aria-disabled={saving || publishDisabled}
        >
          Publikasikan
        </button>
      </div>

      <div className="b-topbar__actions b-topbar__actions--mobile">
        <span className="b-sr-only" role="status" aria-live="polite">
          {SAVE_LABEL[saveState]}
        </span>
        <a
          className="b-iconbtn"
          href={responsesHref}
          aria-label="Lihat respons"
          title="Respons"
        >
          <IconRespons />
        </a>
        <details className="b-menu" ref={menuRef}>
          <summary aria-label="Aksi lainnya" title="Aksi lainnya">
            ⋯
          </summary>
          <div className="b-menu__panel">
            <button type="button" onClick={runFromMenu(onUndo)} disabled={!canUndo}>
              <IconUndo />
              Urungkan
            </button>
            <button type="button" onClick={runFromMenu(onRedo)} disabled={!canRedo}>
              <IconRedo />
              Ulangi
            </button>
            {isPublished && (
              <a href={liveHref} target="_blank" rel="noreferrer" onClick={closeMenu}>
                <IconExternal />
                Lihat form publik
              </a>
            )}
          </div>
        </details>
        <button
          type="button"
          className="b-btn b-btn--publish"
          onClick={onPublish}
          disabled={saving || publishDisabled}
          title={publishDisabled ? publishDisabledReason : undefined}
          aria-disabled={saving || publishDisabled}
        >
          Publikasikan
        </button>
      </div>
    </header>
  );
}
