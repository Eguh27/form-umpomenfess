/**
 * Klien tipis Cloudinary Admin API (tanpa SDK) untuk job cleanup.
 * Dokumentasi: list resources by prefix & delete by public_ids (maks 100/batch).
 * Secret hanya dipakai di header Basic Auth dan tidak pernah dicetak.
 */

import { chunk } from './arrays.mjs';
import { isManagedPublicId } from './public-id.mjs';

const DELETE_BATCH_SIZE = 100;
const DEFAULT_PAGE_SIZE = 500;

/**
 * @param {object} args
 * @param {string} args.cloudName
 * @param {string} args.apiKey
 * @param {string} args.apiSecret
 * @param {typeof fetch} [args.fetchImpl]
 */
export function createCloudinaryAdmin({ cloudName, apiKey, apiSecret, fetchImpl = fetch }) {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('kredensial Cloudinary belum lengkap');
  }

  const baseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}`;
  const auth = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;

  /** @param {string} path @param {RequestInit} [init] */
  async function request(path, init = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: auth, Accept: 'application/json', ...(init.headers ?? {}) },
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
    if (!response.ok) {
      const message = body?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Cloudinary menolak permintaan: ${message}`);
    }
    return body ?? {};
  }

  return {
    /** @param {{prefix?: string, maxResults?: number, cursor?: string | null}} [args] */
    async listPage({ prefix = 'form/', maxResults = DEFAULT_PAGE_SIZE, cursor = null } = {}) {
      const params = new URLSearchParams({ prefix, max_results: String(maxResults) });
      if (cursor) params.set('next_cursor', cursor);
      const body = await request(`/resources/image/upload?${params.toString()}`);
      return {
        assets: Array.isArray(body.resources) ? body.resources : [],
        nextCursor: typeof body.next_cursor === 'string' ? body.next_cursor : null,
      };
    },

    /**
     * Ambil aset dengan batas halaman agar job tidak berjalan tanpa henti.
     * @param {{prefix?: string, maxPages?: number, pageSize?: number}} [args]
     */
    async listAssets({ prefix = 'form/', maxPages = 10, pageSize = DEFAULT_PAGE_SIZE } = {}) {
      const assets = [];
      let cursor = null;
      for (let page = 0; page < maxPages; page += 1) {
        const result = await this.listPage({ prefix, maxResults: pageSize, cursor });
        assets.push(...result.assets);
        if (!result.nextCursor) return assets;
        cursor = result.nextCursor;
      }
      return assets;
    },

    /**
     * Hapus aset yang aman (folder form/). Kembalikan status per publicId.
     * @param {string[]} publicIds
     * @returns {Promise<Map<string, string>>}
     */
    async deleteAssets(publicIds) {
      const statuses = new Map();
      const safeIds = [...new Set(publicIds)].filter(isManagedPublicId);
      for (const batch of chunk(safeIds, DELETE_BATCH_SIZE)) {
        const params = new URLSearchParams();
        for (const id of batch) params.append('public_ids[]', id);
        const body = await request(`/resources/image/upload?${params.toString()}`, {
          method: 'DELETE',
        });
        for (const [id, status] of Object.entries(body.deleted ?? {})) {
          statuses.set(id, String(status).toLowerCase());
        }
      }
      return statuses;
    },
  };
}

/** Status Cloudinary yang berarti aset sudah tidak ada / berhasil dihapus. */
export function isDeletedStatus(status) {
  return status === 'deleted' || status === 'not found' || status === 'not_found';
}
