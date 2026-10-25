/**
 * Query database khusus job cleanup (T-60). Semua akses memakai service role
 * di server/cron; tidak pernah dari browser. Tidak ada isi respons yang dibaca
 * atau dicetak.
 */

import { chunk } from './arrays.mjs';
import { fetchAllRows, unwrap } from './supabase-admin.mjs';

const FORM_COLUMNS = 'id, slug, schema, status, closes_at, updated_at, deleted_at';
const IMAGE_COLUMNS = 'id, form_id, public_id, state, created_at';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 */
export function createCleanupDb(client) {
  return {
    /** Form published yang sudah melewati closes_at. */
    async listExpiredForms(nowIso, limit = 500) {
      const query = client
        .from('forms')
        .select('id, slug, closes_at')
        .eq('status', 'published')
        .is('deleted_at', null)
        .not('closes_at', 'is', null)
        .lte('closes_at', nowIso)
        .limit(limit);
      return unwrap(await query, 'baca form kedaluwarsa');
    },

    async closeForms(ids, nowIso) {
      if (ids.length === 0) return 0;
      let closed = 0;
      for (const batch of chunk(ids, 100)) {
        const data = unwrap(
          await client
            .from('forms')
            .update({ status: 'closed' })
            .in('id', batch)
            .eq('status', 'published')
            .lte('closes_at', nowIso)
            .select('id'),
          'tutup form kedaluwarsa',
        );
        closed += data.length;
      }
      return closed;
    },

    /** Baris gambar tmp yang melewati TTL. */
    async listTmpImages(cutoffIso, limit = 500) {
      const query = client
        .from('form_images')
        .select(IMAGE_COLUMNS)
        .eq('state', 'tmp')
        .lt('created_at', cutoffIso)
        .limit(limit);
      return unwrap(await query, 'baca gambar tmp');
    },

    async markImagesUsed(ids) {
      if (ids.length === 0) return 0;
      let marked = 0;
      for (const batch of chunk(ids, 100)) {
        const data = unwrap(
          await client
            .from('form_images')
            .update({ state: 'used' })
            .in('id', batch)
            .eq('state', 'tmp')
            .select('id'),
          'tandai gambar used',
        );
        marked += data.length;
      }
      return marked;
    },

    async deleteImageRows(ids) {
      if (ids.length === 0) return 0;
      let deleted = 0;
      for (const batch of chunk(ids, 100)) {
        const data = unwrap(
          await client.from('form_images').delete().in('id', batch).select('id'),
          'hapus baris gambar',
        );
        deleted += data.length;
      }
      return deleted;
    },

    /** Form yang soft-deleted lebih lama dari masa retensi. */
    async listSoftDeletedForms(cutoffIso, limit = 200) {
      const query = client
        .from('forms')
        .select(FORM_COLUMNS)
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoffIso)
        .limit(limit);
      return unwrap(await query, 'baca form soft-deleted');
    },

    /** Kandidat arsip: tidak aktif 6 bulan dan belum diarsipkan (hanya dilaporkan, tidak diubah). */
    async listStaleForms(cutoffIso, limit = 200) {
      const query = client
        .from('forms')
        .select('id, slug, status, updated_at')
        .is('deleted_at', null)
        .is('archived_at', null)
        .lt('updated_at', cutoffIso)
        .limit(limit);
      return unwrap(await query, 'baca form tidak aktif');
    },

    async listImagesForForms(formIds) {
      const rows = [];
      for (const ids of chunk(formIds, 100)) {
        const data = unwrap(
          await client.from('form_images').select(IMAGE_COLUMNS).in('form_id', ids),
          'baca gambar milik form',
        );
        rows.push(...data);
      }
      return rows;
    },

    /** Semua publicId di DB (termasuk form soft-deleted) untuk keep-set orphan. */
    async listAllImagePublicIds() {
      const rows = await fetchAllRows(() => client.from('form_images').select('public_id'));
      return rows.map((row) => row.public_id);
    },

    /** Semua schema form (termasuk soft-deleted) untuk keep-set orphan. */
    async listAllFormSchemas() {
      return fetchAllRows(() => client.from('forms').select('id, schema, deleted_at'));
    },

    async deleteForms(ids) {
      if (ids.length === 0) return 0;
      let deleted = 0;
      for (const batch of chunk(ids, 100)) {
        const data = unwrap(
          await client.from('forms').delete().in('id', batch).select('id'),
          'hard delete form',
        );
        deleted += data.length;
      }
      return deleted;
    },
  };
}
