/**
 * BlockList.tsx — panel struktur: pilih, urutkan, hapus blok, dan kelola
 * pemisah halaman (T-73). Tidak ada tombol tambah di sini; permukaan tambah
 * tunggal ada di panel Properti agar tidak ada kontrol ganda.
 */
import type { BlockDraft, BuilderState } from './defaults';
import { splitIntoPages } from './pages';
import { blockSummary } from './blockLabels';
import {
  IconDivider,
  IconDown,
  IconHeading,
  IconImage,
  IconQuestion,
  IconText,
  IconTrash,
  IconUp,
} from './builderIcons';

interface Props {
  state: BuilderState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
}

function BlockIcon({ block }: { block: BlockDraft }) {
  if (block.type === 'heading') return <IconHeading />;
  if (block.type === 'text') return <IconText />;
  if (block.type === 'image') return <IconImage />;
  if (block.type === 'divider') return <IconDivider />;
  return <IconQuestion />;
}

export default function BlockList({ state, selectedId, onSelect, onMove, onRemove }: Props) {
  const pages = splitIntoPages(state.blocks);

  return (
    <div className="b-pages">
      {state.blocks.length === 0 && (
        <p className="b-empty">Belum ada blok. Tambahkan pertanyaan atau elemen dari panel Properti.</p>
      )}

      {pages.map((page, pageIndex) => (
        <section className="b-page" key={`page-${page.pageNumber}`} aria-label={`Halaman ${page.pageNumber}`}>
          <div className="b-page__head">
            <span className="b-page__label">Halaman {page.pageNumber}</span>
            <span className="b-page__title">{page.title}</span>
            <span className="b-page__meta">{page.blocks.length} blok</span>
            {page.breakBlockId !== null && (
              <button
                type="button"
                className="b-page__remove"
                onClick={() => onRemove(page.breakBlockId!)}
                title="Gabungkan dengan halaman sebelumnya"
              >
                Hapus pemisah
              </button>
            )}
          </div>

          {page.blocks.length === 0 ? (
            <p className="b-empty">Halaman ini belum berisi blok.</p>
          ) : (
            <ul className="b-blocklist">
              {page.blocks.map((block) => {
                const globalIndex = state.blocks.findIndex((item) => item.id === block.id);
                const isSelected = block.id === selectedId;
                return (
                  <li className={`b-block${isSelected ? ' is-selected' : ''}`} key={block.id}>
                    <button
                      type="button"
                      className="b-block__select"
                      onClick={() => onSelect(block.id)}
                      aria-pressed={isSelected}
                      aria-label={`Pilih blok ${globalIndex + 1}: ${blockSummary(block)}`}
                    >
                      <span className="b-block__icon">
                        <BlockIcon block={block} />
                      </span>
                      <span className="b-block__summary">{blockSummary(block)}</span>
                    </button>
                    <span className="b-block__actions">
                      <button
                        type="button"
                        className="b-block__action"
                        aria-label={`Naikkan blok ${globalIndex + 1}`}
                        title="Naikkan"
                        disabled={globalIndex === 0}
                        onClick={() => onMove(block.id, -1)}
                      >
                        <IconUp />
                      </button>
                      <button
                        type="button"
                        className="b-block__action"
                        aria-label={`Turunkan blok ${globalIndex + 1}`}
                        title="Turunkan"
                        disabled={globalIndex === state.blocks.length - 1}
                        onClick={() => onMove(block.id, 1)}
                      >
                        <IconDown />
                      </button>
                      <button
                        type="button"
                        className="b-block__action b-block__action--danger"
                        aria-label={`Hapus blok ${globalIndex + 1}`}
                        title="Hapus"
                        onClick={() => onRemove(block.id)}
                      >
                        <IconTrash />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {pageIndex < pages.length - 1 && (
            <p className="b-help">
              Lanjut ke halaman {pageIndex + 2} setelah blok terakhir halaman ini.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
