/** Klien Supabase service-role + pembacaan PostgREST dengan pagination. */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_PAGE_SIZE = 1000;

/**
 * @param {{url: string, serviceRoleKey: string}} args
 */
export function createSupabaseAdmin({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Jalankan query berulang dengan `.range()` sampai habis / batas tercapai.
 * `makeQuery` harus membuat builder baru tiap panggilan (builder bersifat mutable).
 * @param {() => any} makeQuery
 * @param {{pageSize?: number, maxRows?: number}} [options]
 * @returns {Promise<any[]>}
 */
export async function fetchAllRows(makeQuery, { pageSize = DEFAULT_PAGE_SIZE, maxRows = 50000 } = {}) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(`query Supabase gagal: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error(`query Supabase melewati batas ${maxRows} baris; naikkan maxRows dengan hati-hati`);
}

/**
 * @param {{data: any, error: {message: string} | null}} result
 * @param {string} context
 */
export function unwrap(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data ?? [];
}
