/**
 * Editor.tsx — island builder ala Canva (T-41/T-43/T-45, zona B). client:load.
 *
 * Layout Canva:
 * - Bar atas: breadcrumb dashboard, judul form, undo/redo, status simpan, publish, lihat respons.
 * - Dock navigasi kiri:
 *   1. "❓ Tanya Doang & Elemen" (tap to add otomatis, tanpa drag & drop).
 *   2. "📑 Struktur & Halaman" (organisasi blok per halaman).
 *   3. "⚙️ Properti Elemen" (konfigurasi blok terpilih).
 *   4. "✨ Tema & Preset" (preset tema 1-klik + kustomisasi warna/font).
 * - Kanan: preview live HP/desktop dengan simulasi langkah multi-halaman.
 * Autosave 1.5 detik dengan validasi ketat parseFormSchema.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { LIMITS } from '../../lib/config/limits';
import type { FormSchemaData, SchemaIssue } from '../../lib/forms/schema';
import { emptyState, type BlockDraft, type BuilderState } from './defaults';
import { initHistory, pushHistory, undo, redo, canUndo, canRedo } from './history';
import { serialize } from './serialize';
import { sensitiveQuestionIds } from './sensitive';
import { addBlock, moveBlock, removeBlock, updateBlock } from './state';
import { getSupabaseBrowserClient } from './browserClient';
import { markReferencedImagesUsed } from './imagesUsed';
import { appendNewPage } from './pages';
import BlockList from './BlockList';
import BlockPanel from './BlockPanel';
import ThemePanel from './ThemePanel';
import QuestionElements from './QuestionElements';
import PreviewPane from './PreviewPane';

interface Props {
  formId: string;
  slug: string;
  status: string;
  version: number;
  initial: BuilderState;
  cloudName: string;
}

type TabKey = 'elements' | 'blocks' | 'property' | 'theme';
type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'error' | 'invalid';

const SAVE_LABEL: Record<SaveState, string> = {
  clean: 'Tersimpan',
  dirty: 'Ada perubahan…',
  saving: 'Menyimpan…',
  saved: 'Tersimpan ✓',
  error: 'Gagal menyimpan',
  invalid: 'Draft tak valid — TIDAK tersimpan',
};

export default function Editor({ formId, slug, status, version, initial, cloudName }: Props) {
  const [history, setHistory] = useState(() => initHistory(initial ?? emptyState()));
  const state = history.present;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('elements');
  const [saveState, setSaveState] = useState<SaveState>('clean');
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentVersion, setCurrentVersion] = useState(version);

  const stateRef = useRef(state);
  stateRef.current = state;
  const savedRef = useRef(JSON.stringify(state));
  const versionRef = useRef(version);

  const apply = useCallback((next: BuilderState | null) => {
    if (next === null) return;
    setHistory((h) => pushHistory(h, next));
    setSaveState('dirty');
  }, []);

  const save = useCallback(async (kind: 'auto' | 'publish'): Promise<boolean> => {
    setSaveState('saving');
    const result = serialize(stateRef.current);
    if (!result.ok) {
      setSaveState('invalid');
      setIssues(result.issues);
      setNotice(kind === 'publish' ? 'Tidak bisa publish — perbaiki masalah berikut dulu.' : null);
      return false;
    }
    setIssues([]);
    setNotice(null);

    const update: Record<string, unknown> = {
      title: stateRef.current.title,
      schema: result.data,
      theme: result.data.theme,
      updated_at: new Date().toISOString(),
    };
    if (kind === 'publish') {
      update.status = 'published';
      update.version = versionRef.current + 1;
    }

    const { error } = await getSupabaseBrowserClient().from('forms').update(update).eq('id', formId);
    if (error !== null) {
      setSaveState('error');
      setNotice(error.message);
      return false;
    }

    await markReferencedImagesUsed(getSupabaseBrowserClient(), formId, result.data);

    savedRef.current = JSON.stringify(stateRef.current);
    setSaveState('saved');
    if (kind === 'publish') {
      versionRef.current += 1;
      setCurrentVersion(versionRef.current);
      setCurrentStatus('published');
      setNotice(`Form TERPUBLIKASI ✓ — bagikan tautan /f/${slug}`);
    }
    return true;
  }, [formId, slug]);

  /* Autosave: setiap perubahan → tunggu 1.5s tanpa aktivitas baru lalu simpan. */
  useEffect(() => {
    if (saveState !== 'dirty') return;
    const t = setTimeout(() => void save('auto'), 1500);
    return () => clearTimeout(t);
  }, [saveState, history]);

  /* Peringatkan sebelum menutup tab bila ada perubahan yang belum tersimpan. */
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(stateRef.current) !== savedRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Tambah blok dari Palet Canva (Tinggal Tap!)
  const handleAddCustomBlock = (block: BlockDraft, feedbackLabel: string) => {
    if (stateRef.current.blocks.length >= LIMITS.maxBlocksPerForm) {
      setNotice(`Batas tercapai (maks ${LIMITS.maxBlocksPerForm} blok per form).`);
      return;
    }
    const nextBlocks = [...stateRef.current.blocks, block];
    apply({ ...stateRef.current, blocks: nextBlocks });
    setSelectedId(block.id);
    setNotice(`Elemen "${feedbackLabel}" berhasil ditempatkan ✓`);
  };

  // Tambah Halaman Baru (Pemisah Halaman + Judul Halaman)
  const handleAddPage = () => {
    if (stateRef.current.blocks.length + 2 > LIMITS.maxBlocksPerForm) {
      setNotice(`Batas tercapai (maks ${LIMITS.maxBlocksPerForm} blok per form).`);
      return;
    }
    const { blocks, headingId } = appendNewPage(stateRef.current.blocks, 'Bagian Baru');
    apply({ ...stateRef.current, blocks });
    setSelectedId(headingId);
    setTab('blocks');
    setNotice('Halaman baru ditambahkan ke form ✓');
  };

  const onAddType = (type: BlockDraft['type']) => {
    const next = addBlock(stateRef.current, type);
    if (next === null) {
      setNotice(`Batas tercapai (maks ${LIMITS.maxBlocksPerForm} blok / ${LIMITS.maxQuestionsPerForm} pertanyaan).`);
      return;
    }
    apply(next);
    setNotice(null);
    const added = next.blocks[next.blocks.length - 1];
    setSelectedId(added.id);
    setTab('property');
  };

  const selected = state.blocks.find((b) => b.id === selectedId) ?? null;
  const previewSchema: FormSchemaData | null = (() => {
    const r = serialize(state);
    return r.ok ? r.data : null;
  })();

  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      {/* 1. Header Bar Editor ala Canva */}
      <div
        className="card card--plain"
        style={{
          padding: '10px 16px',
          borderRadius: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px' }}>
          <a
            href="/dashboard"
            className="btn btn--ghost btn--sm"
            style={{ textDecoration: 'none', padding: '4px 8px' }}
            title="Kembali ke Dashboard"
          >
            ←
          </a>
          <input
            value={state.title}
            onChange={(e) => apply({ ...state, title: e.target.value })}
            aria-label="Judul form"
            className="input"
            style={{
              flex: '1 1 200px',
              font: '700 1.1rem/1.3 var(--font-display)',
              background: 'transparent',
              border: '1px solid transparent',
              padding: '4px 8px',
            }}
            placeholder="Ketik judul form di sini..."
          />
          <span
            className="pill"
            style={{
              fontSize: '0.72rem',
              background: currentStatus === 'published' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              color: currentStatus === 'published' ? '#059669' : '#b45309',
            }}
          >
            {currentStatus}
          </span>
          <span className="help" style={{ fontSize: '0.75rem' }}>v{currentVersion}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {/* Undo & Redo */}
          <button
            type="button"
            aria-label="Undo"
            className="btn btn--ghost btn--sm"
            style={{ padding: '4px 8px' }}
            onClick={() => setHistory(undo(history))}
            disabled={!canUndo(history)}
            title="Undo (Urungkan)"
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="Redo"
            className="btn btn--ghost btn--sm"
            style={{ padding: '4px 8px' }}
            onClick={() => setHistory(redo(history))}
            disabled={!canRedo(history)}
            title="Redo (Ulangi)"
          >
            ↷
          </button>

          <span
            className="help"
            aria-live="polite"
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '0 6px',
              color: saveState === 'error' || saveState === 'invalid' ? 'var(--danger)' : 'var(--text-muted)',
            }}
          >
            {SAVE_LABEL[saveState]}
          </span>

          <a
            href={`/dashboard/${formId}/respons`}
            className="btn btn--ghost btn--sm"
            style={{ textDecoration: 'none' }}
          >
            📊 Respons
          </a>

          {currentStatus === 'published' && (
            <a
              className="btn btn--ghost btn--sm"
              href={`/f/${slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Lihat form ↗
            </a>
          )}

          <button
            type="button"
            className="btn btn--accent btn--sm"
            style={{ fontWeight: 700 }}
            onClick={() => void save('publish')}
            disabled={saveState === 'saving'}
          >
            {currentStatus === 'published' ? 'Publikasikan Ulang' : '🚀 Publish'}
          </button>
        </div>
      </div>

      {notice && (
        <p className="help" style={{ fontWeight: 700, margin: 0, color: 'var(--brand)' }} role="status">
          {notice}
        </p>
      )}

      {issues.length > 0 && (
        <ul className="help" style={{ color: 'var(--danger)', fontWeight: 600, margin: 0, paddingLeft: 20 }}>
          {issues.slice(0, 4).map((issue, i) => (
            <li key={`${issue.path}-${i}`}>
              <code>{issue.path === '' ? 'schema' : issue.path}</code> — {issue.message}
            </li>
          ))}
          {issues.length > 4 && <li>…dan {issues.length - 4} lagi.</li>}
        </ul>
      )}

      {sensitiveQuestionIds(state.blocks).length > 0 && (
        <p role="alert" className="help" style={{ color: 'var(--danger)', fontWeight: 700, margin: 0 }}>
          Peringatan: ada pertanyaan berisiko data sensitif — klik bloknya di daftar untuk memperbaiki.
        </p>
      )}

      {/* 2. Workspace Layout: Kiri Dock + Panel | Kanan Preview */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {/* Panel Kiri (Tool Dock & Drawer) */}
        <div
          className="card card--plain"
          style={{
            flex: '1 1 360px',
            minWidth: 320,
            borderRadius: 16,
            padding: 'var(--space-4)',
            display: 'grid',
            gap: 'var(--space-3)',
          }}
        >
          {/* Canva Navigation Dock Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 8,
              overflowX: 'auto',
            }}
          >
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: tab === 'elements' ? 'var(--brand)' : 'transparent',
                color: tab === 'elements' ? '#fff' : 'inherit',
                border: tab === 'elements' ? '1px solid var(--brand)' : '1px solid transparent',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              onClick={() => setTab('elements')}
            >
              ❓ Tanya & Elemen
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: tab === 'blocks' ? 'var(--brand)' : 'transparent',
                color: tab === 'blocks' ? '#fff' : 'inherit',
                border: tab === 'blocks' ? '1px solid var(--brand)' : '1px solid transparent',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              onClick={() => setTab('blocks')}
            >
              📑 Halaman & Blok ({state.blocks.length})
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: tab === 'property' ? 'var(--brand)' : 'transparent',
                color: tab === 'property' ? '#fff' : 'inherit',
                border: tab === 'property' ? '1px solid var(--brand)' : '1px solid transparent',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              onClick={() => setTab('property')}
            >
              ⚙️ Properti
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{
                background: tab === 'theme' ? 'var(--brand)' : 'transparent',
                color: tab === 'theme' ? '#fff' : 'inherit',
                border: tab === 'theme' ? '1px solid var(--brand)' : '1px solid transparent',
                fontSize: '0.8rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              onClick={() => setTab('theme')}
            >
              ✨ Tema & Preset
            </button>
          </div>

          {/* Isi Tab Aktif */}
          {tab === 'elements' && (
            <QuestionElements
              onAddBlock={handleAddCustomBlock}
              onAddPage={handleAddPage}
              disabled={state.blocks.length >= LIMITS.maxBlocksPerForm}
            />
          )}

          {tab === 'blocks' && (
            <BlockList
              state={state}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setTab('property');
              }}
              onAdd={onAddType}
              onAddPage={handleAddPage}
              onMove={(id, delta) => apply(moveBlock(stateRef.current, id, delta))}
              onRemove={(id) => apply(removeBlock(stateRef.current, id))}
            />
          )}

          {tab === 'property' && (
            <div>
              {selected !== null ? (
                <BlockPanel
                  block={selected}
                  onPatch={(patch) => apply(updateBlock(stateRef.current, selected.id, patch))}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    Belum ada elemen yang dipilih.
                  </p>
                  <p style={{ fontSize: '0.8rem', margin: '6px 0 0' }}>
                    Pilih blok dari tab <strong>Halaman & Blok</strong> atau tap elemen di tab <strong>Tanya & Elemen</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'theme' && (
            <ThemePanel
              formId={formId}
              theme={state.theme}
              onChange={(patch) =>
                apply({
                  ...stateRef.current,
                  theme: { ...stateRef.current.theme, ...patch },
                })
              }
            />
          )}
        </div>

        {/* Panel Kanan: Preview Live Responsif dengan Simulasi Langkah */}
        <div
          className="card card--plain"
          style={{
            flex: '1 1 360px',
            minWidth: 320,
            borderRadius: 16,
            padding: 'var(--space-4)',
          }}
        >
          <PreviewPane form={previewSchema} cloudName={cloudName} />
        </div>
      </div>
    </div>
  );
}
