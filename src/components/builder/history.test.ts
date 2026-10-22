import { describe, expect, it } from 'vitest';
import { emptyState } from './defaults';
import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  undo,
} from './history';

function stateWith(t0: string) {
  return { ...emptyState('uji'), title: t0 };
}

describe('history undo/redo (T-43)', () => {
  it('push menanam past & mengosongkan future', () => {
    let h = initHistory(stateWith('1'));
    h = pushHistory(h, stateWith('2'));
    h = pushHistory(h, stateWith('3'));
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it('undo mengembalikan present sebelumnya; redo sebaliknya', () => {
    let h = initHistory(stateWith('1'));
    h = pushHistory(h, stateWith('2'));
    h = undo(h);
    expect(h.present.title).toBe('1');
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present.title).toBe('2');
  });

  it('redo berlaku habis setelah push baru', () => {
    let h = initHistory(stateWith('1'));
    h = pushHistory(h, stateWith('2'));
    h = undo(h);
    h = pushHistory(h, stateWith('3'));
    expect(canRedo(h)).toBe(false);
    expect(h.present.title).toBe('3');
  });

  it('undo di ujung awal tidak mengubah apa pun', () => {
    let h = initHistory(stateWith('1'));
    const before = h;
    h = undo(h);
    expect(h).toBe(before);
  });

  it('bit stack dibatasi 50 (past)', () => {
    let h = initHistory(stateWith('0'));
    for (let i = 1; i <= 60; i++) h = pushHistory(h, stateWith(`r${i}`));
    expect(h.past.length).toBe(50);
    h = undo(h); // → r59
    expect(h.present.title).toBe('r59');
  });
});
