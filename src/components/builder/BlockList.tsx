/**
 * BlockList.tsx — daftar blok dengan visualisasi multi-halaman (T-41/T-45, Zona B).
 *
 * Mengelompokkan blok per halaman (Halaman 1: Perkenalan, Halaman 2: Kuesioner, dst).
 * Pemisah halaman (page break) ditampilkan jelas dengan opsi naik/turun/hapus.
 */
import { useState } from 'react';
import type { BlockDraft, BuilderState } from './defaults';
import { LIMITS } from '../../lib/config/limits';
import { isPageBreak, splitIntoPages } from './pages';

interface Props {
  state: BuilderState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BlockDraft['type']) => void;
  onAddPage: () => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
}

const ADDABLE: Array<{ type: BlockDraft['type']; label: string }> = [
  { type: 'question', label: 'Pertanyaan' },
  { type: 'heading', label: 'Judul' },
  { type: 'text', label: 'Teks' },
  { type: 'image', label: 'Gambar' },
  { type: 'divider', label: 'Garis' },
];

const TYPE_ICON: Record<BlockDraft['type'], string> = {
  heading: 'H',
  text: 'T',
  image: '▧',
  divider: '—',
  question: '?',
};

function summary(b: BlockDraft): string {
  if (isPageBreak(b)) return 'Pemisah Halaman (Page Break)';
  if (b.type === 'text' || b.type === 'heading') return b.text || '(teks belum diisi)';
  if (b.type === 'question') return b.label || '(label belum diisi)';
  if (b.type === 'image') return b.publicId === '' ? 'publicId belum diisi' : b.publicId;
  return 'Garis Pembatas';
}

export default function BlockList({
  state,
  selectedId,
  onSelect,
  onAdd,
  onAddPage,
  onMove,
  onRemove,
}: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  const handleAdd = (type: BlockDraft['type']) => {
    setNotice(null);
    onAdd(type);
  };

  const pages = splitIntoPages(state.blocks);

  return (
    <section aria-label="Daftar blok & halaman">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>
          Struktur Form ({state.blocks.length}/{LIMITS.maxBlocksPerForm} blok · {pages.length} Halaman)
        </p>
      </div>

      {state.blocks.length === 0 && (
        <div
          style={{
            padding: 'var(--space-4)',
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1.5px dashed var(--border)',
            borderRadius: 12,
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          Form masih kosong. Tap elemen di atas atau pilih template untuk memulai!
        </div>
      )}

      {/* Tampilan blok yang terbagi rapi berdasarkan halaman */}
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        {pages.map((page, pageIdx) => (
          <div
            key={`page-${page.pageNumber}`}
            style={{
              background: 'var(--surface-soft, rgba(0,0,0,0.02))',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '10px 12px',
            }}
          >
            {/* Header Seksi Halaman */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    background: 'var(--brand)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                  }}
                >
                  HAL {page.pageNumber}
                </span>
                <strong style={{ fontSize: '0.85rem' }}>{page.title}</strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {page.blocks.length} blok
              </span>
            </div>

            {page.blocks.length === 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                Halaman ini belum memiliki blok. Tap elemen untuk menempatkan.
              </p>
            )}

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              {page.blocks.map((block) => {
                const globalIndex = state.blocks.findIndex((b) => b.id === block.id);
                const isSelected = block.id === selectedId;

                return (
                  <li
                    key={block.id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      padding: '7px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                      border: isSelected ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                      transition: 'border-color 0.15s ease',
                    }}
                    onClick={() => onSelect(block.id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(block.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4,
                        background: 'var(--accent-soft)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--brand)',
                      }}
                    >
                      {TYPE_ICON[block.type]}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.83rem',
                        fontWeight: 600,
                      }}
                    >
                      {summary(block)}
                    </span>
                    <span style={{ display: 'flex', gap: 3 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        aria-label={`Naikkan blok ${globalIndex + 1}`}
                        disabled={globalIndex === 0}
                        onClick={() => onMove(block.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        aria-label={`Turunkan blok ${globalIndex + 1}`}
                        disabled={globalIndex === state.blocks.length - 1}
                        onClick={() => onMove(block.id, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--danger)' }}
                        aria-label={`Hapus blok ${globalIndex + 1}`}
                        onClick={() => onRemove(block.id)}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Jika halaman ini memiliki pemisah halaman sesudahnya */}
            {pageIdx < pages.length - 1 && (
              <div
                style={{
                  marginTop: 10,
                  padding: '6px 10px',
                  background: 'var(--brand-soft, #f0fdf4)',
                  border: '1.5px dashed var(--brand)',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--brand)',
                }}
              >
                <span>⬇ <strong>Pemisah Halaman</strong> (Lanjut ke Halaman {pageIdx + 2})</span>
                {page.breakBlockId && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                    onClick={() => onRemove(page.breakBlockId!)}
                    title="Gabungkan kembali dengan halaman berikutnya"
                  >
                    Hapus Pemisah
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {notice && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{notice}</p>}

      {/* Bar Cepat Tambah Blok / Halaman Baru */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-3)' }}>
        <button
          type="button"
          className="btn btn--accent btn--sm"
          style={{ padding: '5px 12px', fontSize: '0.82rem' }}
          onClick={onAddPage}
        >
          + Tambah Halaman Baru
        </button>
        {ADDABLE.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="btn btn--ghost btn--sm"
            style={{ padding: '5px 10px', fontSize: '0.82rem' }}
            onClick={() => handleAdd(type)}
          >
            + {label}
          </button>
        ))}
      </div>
    </section>
  );
}
