/** Logika murni perencanaan cleanup (tanpa I/O) — mudah diuji. */

import { isManagedPublicId } from './public-id.mjs';

const MAX_SCHEMA_DEPTH = 20;

/**
 * Kumpulkan publicId gambar dari schema form yang sudah tervalidasi.
 * Hanya kunci `publicId`/`bannerPublicId` dan nilai folder `form/`.
 * @param {unknown} value
 * @param {Set<string>} [out]
 * @param {number} [depth]
 */
export function collectSchemaPublicIds(value, out = new Set(), depth = 0) {
  if (depth > MAX_SCHEMA_DEPTH) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectSchemaPublicIds(item, out, depth + 1);
    return out;
  }
  if (!value || typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value)) {
    if (
      (key === 'publicId' || key === 'bannerPublicId') &&
      typeof child === 'string' &&
      isManagedPublicId(child)
    ) {
      out.add(child);
    } else if (child && typeof child === 'object') {
      collectSchemaPublicIds(child, out, depth + 1);
    }
  }
  return out;
}

/**
 * Keep-set = semua publicId tercatat di DB + semua yang masih dirujuk schema.
 * @param {{imagePublicIds?: string[], forms?: Array<{schema?: unknown}>}} input
 */
export function buildKeepSet({ imagePublicIds = [], forms = [] }) {
  const keep = new Set();
  for (const id of imagePublicIds) if (isManagedPublicId(id)) keep.add(id);
  for (const form of forms) {
    for (const id of collectSchemaPublicIds(form?.schema)) keep.add(id);
  }
  return keep;
}

/**
 * Orphan = ada di Cloudinary folder form/, tidak di DB/schema, dan cukup tua.
 * Aset tanpa created_at valid tidak pernah dihapus (fail-safe).
 * @param {{assets: Array<{public_id: string, created_at?: string}>, keep: Set<string>, now: Date, minAgeHours: number}} input
 */
export function selectOrphans({ assets, keep, now, minAgeHours }) {
  const cutoff = now.getTime() - minAgeHours * 3600_000;
  return assets.filter((asset) => {
    if (!isManagedPublicId(asset.public_id)) return false;
    if (keep.has(asset.public_id)) return false;
    const createdAt = Date.parse(asset.created_at ?? '');
    return Number.isFinite(createdAt) && createdAt < cutoff;
  });
}

/**
 * publicId yang harus dihapus saat sebuah form di-purge: baris DB + schema.
 * @param {{schema?: unknown, imageRows?: Array<{public_id: string}>}} input
 */
export function formAssetIds({ schema, imageRows = [] }) {
  const ids = collectSchemaPublicIds(schema);
  for (const row of imageRows) if (isManagedPublicId(row.public_id)) ids.add(row.public_id);
  return [...ids];
}
