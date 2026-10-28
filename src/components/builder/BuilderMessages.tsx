/**
 * BuilderMessages.tsx — pesan validasi, galat simpan, peringatan sensitif,
 * dan toast singkat (T-73). Semua aksi navigasi diserahkan ke Editor.
 */
import type { SchemaIssue } from '../../lib/forms/schema';
import type { BlockDraft } from './defaults';
import { blockIndexFromIssuePath, blockSummary } from './blockLabels';
import { IconAlert, IconCheck, IconClose } from './builderIcons';

export interface BuilderNotice {
  message: string;
  href?: string;
}

interface Props {
  issues: SchemaIssue[];
  saveError: string | null;
  sensitiveBlocks: BlockDraft[];
  notice: BuilderNotice | null;
  onDismissError: () => void;
  onDismissNotice: () => void;
  onIssueSelect: (path: string) => void;
  onSensitiveSelect: (id: string) => void;
}

const MAX_VISIBLE_ISSUES = 4;

function issueLabel(path: string): string {
  if (path.startsWith('theme')) return 'Tema';
  const index = blockIndexFromIssuePath(path);
  return index === null ? 'Formulir' : `Blok ${index + 1}`;
}

export default function BuilderMessages({
  issues,
  saveError,
  sensitiveBlocks,
  notice,
  onDismissError,
  onDismissNotice,
  onIssueSelect,
  onSensitiveSelect,
}: Props) {
  const hasMessages = issues.length > 0 || saveError !== null || sensitiveBlocks.length > 0;

  return (
    <>
      {hasMessages && (
        <div className="b-messages" aria-label="Pesan builder">
          {issues.length > 0 && (
            <div className="b-message b-message--danger" role="alert">
              <IconAlert />
              <div className="b-message__body">
                <p className="b-message__title">Draf belum bisa disimpan</p>
                <ul className="b-message__list">
                  {issues.slice(0, MAX_VISIBLE_ISSUES).map((issue, index) => (
                    <li key={`${issue.path}-${index}`}>
                      <button
                        type="button"
                        className="b-message__item"
                        onClick={() => onIssueSelect(issue.path)}
                      >
                        {issueLabel(issue.path)} — {issue.message}
                      </button>
                    </li>
                  ))}
                  {issues.length > MAX_VISIBLE_ISSUES && (
                    <li className="b-message__more">
                      …dan {issues.length - MAX_VISIBLE_ISSUES} masalah lain.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {saveError !== null && (
            <div className="b-message b-message--danger" role="alert">
              <IconAlert />
              <div className="b-message__body">
                <p className="b-message__title">Penyimpanan gagal</p>
                <p className="b-message__text">{saveError}</p>
              </div>
              <button
                type="button"
                className="b-message__close"
                onClick={onDismissError}
                aria-label="Tutup pesan galat"
              >
                <IconClose />
              </button>
            </div>
          )}

          {sensitiveBlocks.length > 0 && (
            <div className="b-message b-message--danger" role="alert">
              <IconAlert />
              <div className="b-message__body">
                <p className="b-message__title">Publikasi Diblokir: Terdeteksi Pertanyaan Sensitif</p>
                <p className="b-message__text">
                  Tombol publikasi dinonaktifkan karena formulir meminta kata sandi, PIN, NIK, atau rekening. Hapus atau ubah pertanyaan berikut agar formulir dapat dipublikasikan.
                </p>
                <ul className="b-message__list">
                  {sensitiveBlocks.map((block) => (
                    <li key={block.id}>
                      <button
                        type="button"
                        className="b-message__item"
                        onClick={() => onSensitiveSelect(block.id)}
                      >
                        {blockSummary(block)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {notice !== null && (
        <div className="b-toast b-toast--success" role="status" aria-live="polite">
          <IconCheck />
          <div className="b-toast__text">
            {notice.message}
            {notice.href !== undefined && (
              <a className="b-toast__link" href={notice.href} target="_blank" rel="noreferrer">
                Buka form
              </a>
            )}
          </div>
          <button
            type="button"
            className="b-toast__close"
            onClick={onDismissNotice}
            aria-label="Tutup pemberitahuan"
          >
            <IconClose />
          </button>
        </div>
      )}
    </>
  );
}
