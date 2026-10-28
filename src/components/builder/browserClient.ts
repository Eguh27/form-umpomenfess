/**
 * browserClient.ts — client Supabase sisi browser untuk island (T-40/T-41).
 *
 * Semua baca/tulis pakai kredensial user dari cookie sesi (@supabase/ssr
 * menyalin token auth ke storage browser), jadi RLS tetap penjaga:
 * CRUD hanya menyentuh form milik user. Kunci anon publik (PUBLIC_*) saja.
 *
 * T-80: @supabase/ssr menulis cookie auth dengan maxAge 400 hari. Adaptor
 * setAll di bawah menimpa kebijakan itu agar sesi tanpa "ingat saya" tetap
 * cookie sesi (hilang saat browser ditutup), dan yang "ingat saya" 30 hari.
 */
import {
  createBrowserClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isRemembered,
  sessionCookieOptions,
} from '../../lib/auth/session';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(document.cookie);
          },
          setAll(cookiesToSet) {
            // Baca ulang tiap penulisan: preferensi bisa berubah antar-tab.
            const remember = isRemembered(document.cookie);
            const secure = window.location.protocol === 'https:';
            for (const { name, value, options } of cookiesToSet) {
              document.cookie = serializeCookieHeader(
                name,
                value,
                sessionCookieOptions(options, remember, secure),
              );
            }
          },
        },
      },
    );
  }
  return client;
}
