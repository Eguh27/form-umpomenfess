/**
 * useBuilderState.ts — riwayat undo/redo dan isu validasi builder (T-73).
 * Semua perubahan draft menandai dirty dan membersihkan isu lama.
 */
import { useCallback, useRef, useState } from 'react';
import type { SchemaIssue } from '../../lib/forms/schema';
import type { BuilderState } from './defaults';
import { canRedo, canUndo, initHistory, pushHistory, redo, undo } from './history';

export interface BuilderStateApi {
  state: BuilderState;
  stateRef: { current: BuilderState };
  canUndo: boolean;
  canRedo: boolean;
  issues: SchemaIssue[];
  setIssues: (issues: SchemaIssue[]) => void;
  apply: (next: BuilderState) => void;
  undo: () => void;
  redo: () => void;
}

export function useBuilderState(initial: BuilderState): BuilderStateApi {
  const [history, setHistory] = useState(() => initHistory(initial));
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const state = history.present;
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback((next: BuilderState) => {
    setHistory((current) => pushHistory(current, next));
    setIssues([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((current) => undo(current));
    setIssues([]);
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((current) => redo(current));
    setIssues([]);
  }, []);

  return {
    state,
    stateRef,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    issues,
    setIssues,
    apply,
    undo: handleUndo,
    redo: handleRedo,
  };
}
