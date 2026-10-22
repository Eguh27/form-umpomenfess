/** Adapter Supabase Storage untuk backup mingguan (bucket privat). */

import { readFile } from 'node:fs/promises';
import { chunk } from './arrays.mjs';

const LIST_LIMIT = 1000;
const REMOVE_BATCH = 100;

/**
 * @param {{client: import('@supabase/supabase-js').SupabaseClient, bucket: string}} args
 */
export function createBackupStorage({ client, bucket }) {
  const storage = client.storage;

  function fail(context, error) {
    throw new Error(`${context}: ${error?.message ?? 'error Storage'}`);
  }

  return {
    bucket,

    async ensureBucket() {
      const existing = await storage.getBucket(bucket);
      if (!existing.error) return;
      const created = await storage.createBucket(bucket, { public: false });
      if (created.error && !/already exists/i.test(created.error.message)) {
        fail('buat bucket backup', created.error);
      }
    },

    /** @param {string} key @param {string} filePath */
    async uploadFile(key, filePath, contentType = 'application/octet-stream') {
      const body = await readFile(filePath);
      const { error } = await storage.from(bucket).upload(key, body, {
        contentType,
        upsert: false,
        cacheControl: 'no-store',
      });
      if (error) fail(`unggah ${key}`, error);
    },

    /** @param {string} key @param {string} text */
    async uploadText(key, text) {
      const { error } = await storage.from(bucket).upload(key, text, {
        contentType: 'text/plain; charset=utf-8',
        upsert: false,
        cacheControl: 'no-store',
      });
      if (error) fail(`unggah ${key}`, error);
    },

    /** @param {string} key */
    async info(key) {
      const { data, error } = await storage.from(bucket).info(key);
      if (error) fail(`info ${key}`, error);
      return data;
    },

    /** @param {string} prefix */
    async list(prefix) {
      const { data, error } = await storage.from(bucket).list(prefix, { limit: LIST_LIMIT });
      if (error) fail('daftar backup', error);
      return (data ?? [])
        .filter((item) => item.id !== null)
        .map((item) => ({
          path: `${prefix}/${item.name}`,
          created_at: item.created_at ?? item.updated_at ?? null,
        }));
    },

    /** @param {string[]} paths */
    async remove(paths) {
      let removed = 0;
      for (const batch of chunk(paths, REMOVE_BATCH)) {
        const { data, error } = await storage.from(bucket).remove(batch);
        if (error) fail('hapus backup lama', error);
        removed += data?.length ?? 0;
      }
      return removed;
    },
  };
}
