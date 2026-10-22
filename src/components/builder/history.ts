/**
 * history.ts — stack undo/redo murni (T-43). Snapshot state secara keseluruhan
 * (JSON clone) — jumlah edit kecil (maks 120 blok), aman performanya.
 */
import type { BuilderState } from './defaults';

export interface History {
  past: BuilderState[];
  present: BuilderState;
  future: BuilderState[];
}

const MAX_HISTORY = 50;

export function initHistory(state: BuilderState): History {
  return { past: [], present: state, future: [] };
}

/** Simpan state baru; memotong redo yang tak berlaku lagi. */
export function pushHistory(h: History, next: BuilderState): History {
  const past = [...h.past, h.present].slice(-MAX_HISTORY);
  return { past, present: next, future: [] };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future].slice(0, MAX_HISTORY),
  };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    past: [...h.past, h.present].slice(-MAX_HISTORY),
    present: next,
    future: rest,
  };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}
