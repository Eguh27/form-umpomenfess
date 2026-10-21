/// <reference types="astro/client" />

/**
 * Tipe tambahan App.Locals untuk sesi Supabase (T-13, Agent A).
 * Middleware mengisi locals.supabase (client per-request) & locals.user.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient | null;
      user: User | null;
    }
  }
}
