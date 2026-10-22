/**
 * guardedInsert.ts — mapping hasil RPC `insert_response_guarded` (T-64 @A).
 * Pemisahan supaya logika pemetaan kode SQL → hasil endpoint bisa diuji.
 * 'backend_belum_siap' = fungsi belum ada (migrasi belum dijalankan manusia):
 * endpoint memakai jalur legacy count→insert (R1 TODO ketika sudah dipush).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormAnswerValue } from './schema';

export type GuardedReason =
  | 'duplikat'
  | 'sudah_tutup'
  | 'penuh'
  | 'form_tidak_tersedia'
  | 'payload'
  | 'backend_belum_siap'
  | 'gagal_db';

export type GuardedResult = { ok: true } | { ok: false; reason: GuardedReason };

const PGCODE_UNDEFINED_FUNCTION = '42883';

interface RpcErrorLike {
  code?: string | null;
  message?: string;
}

export async function tryGuardedInsert(
  service: SupabaseClient,
  form: { id: string; version: number },
  answers: Record<string, FormAnswerValue>,
  token: string | null,
): Promise<GuardedResult> {
  let data: unknown;
  let error: RpcErrorLike | null;
  try {
    const res = await service.rpc('insert_response_guarded', {
      p_form_id: form.id,
      p_version: form.version,
      p_answers: answers,
      p_client_token: token ?? null,
    });
    data = (res as { data: unknown }).data;
    error = (res as { error: RpcErrorLike | null }).error;
  } catch {
    return { ok: false, reason: 'gagal_db' };
  }

  if (error !== null) {
    if (
      error.code === PGCODE_UNDEFINED_FUNCTION ||
      (error.message ?? '').includes('does not exist')
    ) {
      return { ok: false, reason: 'backend_belum_siap' };
    }
    return { ok: false, reason: 'gagal_db' };
  }

  switch (data) {
    case 'ok':
      return { ok: true };
    case 'duplikat':
    case 'sudah_tutup':
    case 'penuh':
    case 'form_tidak_tersedia':
    case 'payload':
      return { ok: false, reason: data };
    case null:
    case undefined:
      return { ok: false, reason: 'gagal_db' };
    default:
      return { ok: false, reason: 'gagal_db' };
  }
}
