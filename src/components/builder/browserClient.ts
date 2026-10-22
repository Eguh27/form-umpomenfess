/**
 * browserClient.ts — client Supabase sisi browser untuk island (T-40/T-41).
 *
 * Semua baca/tulis pakai kredensial user dari cookie sesi (@supabase/ssr
 * menyalin token auth ke storage browser), jadi RLS tetap penjaga:
 * CRUD hanya menyentuh form milik user. Kunci anon publik (PUBLIC_*) saja.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
