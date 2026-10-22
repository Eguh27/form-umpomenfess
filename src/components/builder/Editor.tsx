/**
 * Editor.tsx — island builder (T-41/T-43, zona B). client:load.
 *
 * Layout: bar atas (judul, undo/redo, status simpan, publish) · kiri: daftar
 * blok + tab panel (Properti/Tema) · kanan: preview live HP/desktop.
 * Autosave 1.5 detik dengan aturan T-44: builder TIDAK PERNAH menyimpan
 * payload yang gagal parseFormSchema — hanya menampilkan daftarnya.
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
import BlockList from './BlockList';
import BlockPanel from './BlockPanel';
import ThemePanel from './ThemePanel';
import PreviewPane from './PreviewPane';

interface Props {
  formId: string;
  slug: string;
  status: string;
  version: number;
  initial: BuilderState;
  cloudName: string;
}

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
  const [tab, setTab] = useState<'block' | 'theme'>('block');
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

    // T-64 @B: gambar yang sekarang direferensi schema → state 'used'.
    // Gagal menandai tidak membatalkan simpanan form.
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

  const onAdd = (type: BlockDraft['type']) => {
    const next = addBlock(stateRef.current, type);
    if (next === null) {
      setNotice(`Batas tercapai (maks ${LIMITS.maxBlocksPerForm} blok / ${LIMITS.maxQuestionsPerForm} pertanyaan).`);
      return;
    }
    apply(next);
    setNotice(null);
    const added = next.blocks[next.blocks.length - 1];
    setSelectedId(added.id);
    setTab('block');
  };

  const selected = state.blocks.find((b) => b.id === selectedId) ?? null;
  const previewSchema: FormSchemaData | null = (() => {
    const r = serialize(state);
    return r.ok ? r.data : null;
  })();

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input
          value={state.title}
          onChange={(e) => apply({ ...state, title: e.target.value })}
          aria-label="Judul form"
          className="input"
          style={{ flex: '1 1 260px', font: '700 1.15rem/1.3 var(--font-display)', background: 'transparent' }}
        />
        <span className="pill">{currentStatus}</span>
        <span className="help">v{currentVersion}</span>
        <button type="button" aria-label="Undo" onClick={() => setHistory(undo(history))} disabled={!canUndo(history)}>↶</button>
        <button type="button" aria-label="Redo" onClick={() => setHistory(redo(history))} disabled={!canRedo(history)}>↷</button>
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => void save('publish')}
          disabled={saveState === 'saving'}
        >
          {currentStatus === 'published' ? 'Publikasikan ulang' : 'Publish'}
        </button>
        {currentStatus === 'published' && (
          <a className="btn btn--ghost" href={`/f/${slug}`}>Lihat form ↗</a>
        )}
      </div>

      <p className="help" aria-live="polite">{SAVE_LABEL[saveState]}</p>
      {notice && (
        <p className="help" style={{ fontWeight: 700 }} role="status">{notice}</p>
      )}
      {issues.length > 0 && (
        <ul className="help" style={{ color: 'var(--danger)', fontWeight: 600 }}>
          {issues.slice(0, 6).map((issue, i) => (
            <li key={`${issue.path}-${i}`}><code>{issue.path === '' ? 'schema' : issue.path}</code> — {issue.message}</li>
          ))}
          {issues.length > 6 && <li>…dan {issues.length - 6} lagi.</li>}
        </ul>
      )}
      {sensitiveQuestionIds(state.blocks).length > 0 && (
        <p role="alert" className="help" style={{ color: 'var(--danger)', fontWeight: 700 }}>
          ⚠ Ada pertanyaan berisiko data sensitif — klik bloknya di daftar kiri untuk memperbaiki.
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)', alignItems: 'flex-start' }}>
        <div className="card card--plain" style={{ flex: '1 1 300px', minWidth: 272 }}>
          <BlockList
            state={state}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setTab('block'); }}
            onAdd={onAdd}
            onMove={(id, delta) => apply(moveBlock(stateRef.current, id, delta))}
            onRemove={(id) => apply(removeBlock(stateRef.current, id))}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={`btn btn--ghost`}
              style={{ padding: '6px 12px', borderColor: tab === 'block' ? 'var(--brand)' : 'var(--border)' }}
              onClick={() => setTab('block')}
              aria-pressed={tab === 'block'}
            >
              Properti
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ padding: '6px 12px', borderColor: tab === 'theme' ? 'var(--brand)' : 'var(--border)' }}
              onClick={() => setTab('theme')}
              aria-pressed={tab === 'theme'}
            >
              Tema
            </button>
          </div>
          {tab === 'block' && selected !== null && (
            <BlockPanel
              block={selected}
              onPatch={(patch) => apply(updateBlock(stateRef.current, selected.id, patch))}
            />
          )}
          {tab === 'theme' && (
            <ThemePanel
              theme={state.theme}
              onChange={(patch) => apply({ ...(stateRef.current), theme: { ...(stateRef.current.theme), ...patch } })}
            />
          )}
        </div>

        <div className="card card--plain" style={{ flex: '1 1 340px', minWidth: 300 }}>
          <PreviewPane form={previewSchema} cloudName={cloudName} />
        </div>
      </div>
    </div>
  );
}
