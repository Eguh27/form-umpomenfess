/**
 * service.ts — client Supabase SERVICE ROLE (server-only, zona C).
 * Dipakai API endpoint untuk operasi yang RLS sengaja tidak buka:
 * hitung respons (quota) & INSERT responses (TASK 4.4: hanya dari server).
 *
 * VALIDASI: secret TIDAK boleh mencapai frontend — file ini hanya diimpor
 * dari endpoint .ts (server). Jangan pernah dipakai di komponen/island.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null | undefined;

export function getSupabaseService(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim() ?? '';
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  cached = url !== '' && serviceKey !== '' ? createClient(url, serviceKey) : null;
  return cached;
}
