import { describe, expect, it } from 'vitest';
import { emptyState, type BuilderState } from './defaults';
import { friendlySaveError, sameSnapshot, snapshotState } from './saveGuard';

function withTitle(state: BuilderState, title: string): BuilderState {
  return { ...state, title };
}

describe('snapshotState / sameSnapshot', () => {
  it('snapshot sama untuk state yang tidak berubah', () => {
    const state = emptyState('Survei');
    expect(sameSnapshot(snapshotState(state), state)).toBe(true);
  });

  it('perubahan judul membuat snapshot berbeda', () => {
    const state = emptyState('Survei');
    const snapshot = snapshotState(state);
    expect(sameSnapshot(snapshot, withTitle(state, 'Survei baru'))).toBe(false);
  });

  it('perubahan tema dan blok ikut terdeteksi', () => {
    const state = emptyState('Survei');
    const snapshot = snapshotState(state);
    const themeChanged = { ...state, theme: { ...state.theme, accent: '#123456' } };
    const blockChanged = {
      ...state,
      blocks: [{ id: 'b1', type: 'text' as const, text: 'Halo' }],
    };
    expect(sameSnapshot(snapshot, themeChanged)).toBe(false);
    expect(sameSnapshot(snapshot, blockChanged)).toBe(false);
  });
});

describe('friendlySaveError', () => {
  it('tidak meneruskan pesan mentah Postgres', () => {
    const message = friendlySaveError({
      code: '42501',
      message: 'new row violates row-level security policy for table "forms"',
    });
    expect(message).not.toContain('row-level security');
    expect(message).toContain('tidak punya akses');
  });

  it('memetakan galat jaringan dan fallback', () => {
    expect(friendlySaveError({ message: 'TypeError: Failed to fetch' })).toContain('Koneksi');
    expect(friendlySaveError({ code: 'XX000', message: 'internal error' })).toBe(
      'Gagal menyimpan. Coba lagi beberapa saat.',
    );
    expect(friendlySaveError(null)).toBe('Gagal menyimpan. Coba lagi.');
  });
});
