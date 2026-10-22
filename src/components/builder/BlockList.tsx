/**
 * BlockList.tsx — daftar blok + tombol naik/turun/hapus + tambah blok (T-41).
 * (Drag&drop menyusul sesuai TASK 2 — MVP klik arah.)
 */
import { useState } from 'react';
import type { BlockDraft, BuilderState } from './defaults';
import { LIMITS } from '../../lib/config/limits';

interface Props {
  state: BuilderState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: BlockDraft['type']) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
}

const ADDABLE: Array<{ type: BlockDraft['type']; label: string }> = [
  { type: 'heading', label: 'Judul' },
  { type: 'text', label: 'Teks' },
  { type: 'image', label: 'Gambar' },
  { type: 'divider', label: 'Pembatas' },
  { type: 'question', label: 'Pertanyaan' },
];

const TYPE_ICON: Record<BlockDraft['type'], string> = {
  heading: 'H',
  text: 'T',
  image: '🖼',
  divider: '—',
  question: '?',
};

function summary(b: BlockDraft): string {
  if (b.type === 'text' || b.type === 'heading') return b.text;
  if (b.type === 'question') return b.label;
  if (b.type === 'image') return b.publicId === '' ? 'publicId belum diisi' : b.publicId;
  return '—';
}

export default function BlockList({ state, selectedId, onSelect, onAdd, onMove, onRemove }: Props) {
  const [notice, setNotice] = useState<string | null>(null);

  const handleAdd = (type: BlockDraft['type']) => {
    setNotice(null);
    onAdd(type); // kalau melebihi limit, Editor yang menampilkan error (addBlock → null)
  };

  return (
    <section aria-label="Daftar blok">
      <p className="eyebrow">Blok ({state.blocks.length} / {LIMITS.maxBlocksPerForm})</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 6 }}>
        {state.blocks.map((block, idx) => (
          <li
            key={block.id}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '8px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              background: block.id === selectedId ? 'var(--accent-soft)' : 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            onClick={() => onSelect(block.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(block.id)}
            role="button"
            tabIndex={0}
          >
            <span aria-hidden="true" style={{ width: 22, textAlign: 'center' }}>{TYPE_ICON[block.type]}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary(block)}
            </span>
            <span style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
              <button type="button" aria-label={`Naikkan blok ${idx + 1}`} disabled={idx === 0} onClick={() => onMove(block.id, -1)}>↑</button>
              <button type="button" aria-label={`Turunkan blok ${idx + 1}`} disabled={idx === state.blocks.length - 1} onClick={() => onMove(block.id, 1)}>↓</button>
              <button type="button" aria-label={`Hapus blok ${idx + 1}`} onClick={() => onRemove(block.id)}>✕</button>
            </span>
          </li>
        ))}
      </ul>
      {notice && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{notice}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-3)' }}>
        {ADDABLE.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className="btn btn--ghost"
            style={{ padding: '5px 12px', fontSize: '0.85rem' }}
            onClick={() => handleAdd(type)}
          >
            + {label}
          </button>
        ))}
      </div>
    </section>
  );
}
