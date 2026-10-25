/**
 * saveGuard.ts — penjaga autosave builder (T-73).
 * Snapshot murni dipakai untuk memastikan status "Tersimpan" hanya muncul
 * bila state saat ini identik dengan state yang benar-benar dikirim ke server.
 */
import type { BuilderState } from './defaults';

export interface SaveErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/** Serialisasi state yang dikirim saat simpan (judul + tema + blok). */
export function snapshotState(state: BuilderState): string {
  return JSON.stringify({
    title: state.title,
    theme: state.theme,
    blocks: state.blocks,
  });
}

/** True bila snapshot yang dikirim masih sama dengan state sekarang. */
export function sameSnapshot(sentSnapshot: string, current: BuilderState): boolean {
  return sentSnapshot === snapshotState(current);
}

/** Ubah galat Supabase/Postgres menjadi pesan yang ramah untuk pembuat form. */
export function friendlySaveError(error: SaveErrorLike | null): string {
  if (error === null) return 'Gagal menyimpan. Coba lagi.';

  const code = error.code ?? '';
  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'Kamu tidak punya akses untuk menyimpan form ini.';
  }
  if (code === '23514' || message.includes('check constraint')) {
    return 'Server menolak data form. Periksa isian lalu coba lagi.';
  }
  if (code === '23505') {
    return 'Terjadi bentrok data. Muat ulang halaman lalu coba lagi.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Koneksi terputus. Periksa jaringan lalu coba lagi.';
  }
  return 'Gagal menyimpan. Coba lagi beberapa saat.';
}
