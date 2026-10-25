/**
 * useAutosave.ts — simpan otomatis/publikasi builder (T-73).
 * Snapshot + saveSeq mencegah balasan lama menimpa status yang lebih baru.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SchemaIssue } from '../../lib/forms/schema';
import type { BuilderState } from './defaults';
import { serialize } from './serialize';
import { getSupabaseBrowserClient } from './browserClient';
import { markReferencedImagesUsed } from './imagesUsed';
import { friendlySaveError, sameSnapshot, snapshotState } from './saveGuard';
import type { SaveState } from './BuilderTopbar';
import type { BuilderNotice } from './BuilderMessages';

type SaveKind = 'auto' | 'publish';

interface Options {
  formId: string;
  slug: string;
  state: BuilderState;
  stateRef: { current: BuilderState };
  version: number;
  setIssues: (issues: SchemaIssue[]) => void;
  setNotice: (notice: BuilderNotice | null) => void;
  onPublished: (version: number) => void;
}

export interface AutosaveApi {
  saveState: SaveState;
  saveError: string | null;
  dismissError: () => void;
  publish: () => void;
}

export function useAutosave({
  formId,
  slug,
  state,
  stateRef,
  version,
  setIssues,
  setNotice,
  onPublished,
}: Options): AutosaveApi {
  const [saveState, setSaveState] = useState<SaveState>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);
  const versionRef = useRef(version);
  const savedSnapshotRef = useRef(snapshotState(stateRef.current));
  const saveSeqRef = useRef(0);
  const previousStateRef = useRef(state);

  const save = useCallback(
    async (kind: SaveKind): Promise<boolean> => {
      const seq = ++saveSeqRef.current;
      const snapshot = snapshotState(stateRef.current);
      setSaveState('saving');
      setSaveError(null);

      const result = serialize(stateRef.current);
      if (!result.ok) {
        setSaveState('invalid');
        setIssues(result.issues);
        return false;
      }
      setIssues([]);

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

      const { error } = await getSupabaseBrowserClient()
        .from('forms')
        .update(update)
        .eq('id', formId);

      if (seq !== saveSeqRef.current) return false;

      if (error !== null) {
        setSaveState('error');
        setSaveError(friendlySaveError(error));
        return false;
      }

      await markReferencedImagesUsed(getSupabaseBrowserClient(), formId, result.data)
        .catch(() => false);
      if (seq !== saveSeqRef.current) return false;

      savedSnapshotRef.current = snapshot;
      setSaveState(sameSnapshot(snapshot, stateRef.current) ? 'saved' : 'dirty');

      if (kind === 'publish') {
        versionRef.current += 1;
        onPublished(versionRef.current);
        setNotice({ message: 'Form terbit dan siap dibagikan.', href: `/f/${slug}` });
      }
      return true;
    },
    [formId, slug, onPublished, setIssues, setNotice],
  );

  /* Setiap perubahan draft menandai dirty — termasuk undo/redo. */
  useEffect(() => {
    if (previousStateRef.current === state) return;
    previousStateRef.current = state;
    setSaveState('dirty');
  }, [state]);

  /* Autosave: jeda 1.5 detik setelah perubahan terakhir. */
  useEffect(() => {
    if (saveState !== 'dirty') return;
    const timer = setTimeout(() => void save('auto'), 1500);
    return () => clearTimeout(timer);
  }, [saveState, state, save]);

  /* Peringatkan sebelum menutup tab bila snapshot terakhir belum tersimpan. */
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (sameSnapshot(savedSnapshotRef.current, stateRef.current)) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [stateRef]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = setTimeout(() => setSaveState('clean'), 4000);
    return () => clearTimeout(timer);
  }, [saveState]);

  const publish = useCallback(() => {
    void save('publish');
  }, [save]);

  return {
    saveState,
    saveError,
    dismissError: () => setSaveError(null),
    publish,
  };
}
