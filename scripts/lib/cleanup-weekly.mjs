/** Tugas cleanup mingguan: orphan Cloudinary, purge soft-deleted, laporan arsip. */

import { isDeletedStatus } from './cloudinary.mjs';
import { buildKeepSet, selectOrphans } from './cleanup-plan.mjs';
import { purgeSoftDeleted } from './cleanup-purge.mjs';

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {boolean} args.apply
 * @param {object} args.db
 * @param {object} args.cloudinary
 * @param {object} args.options
 * @param {(step: string, error: unknown) => void} args.record
 */
export async function runWeekly({ now, apply, db, cloudinary, options, record }) {
  const result = {
    orphans: 0,
    deletedOrphans: 0,
    softDeletedForms: 0,
    purgedForms: 0,
    purgedImages: 0,
    staleForms: 0,
  };

  const loaded = await loadKeepSet(db, record);
  if (loaded) {
    await deleteOrphans({ now, apply, cloudinary, options, keep: loaded.keep, result, record });
    try {
      await purgeSoftDeleted({
        now,
        apply,
        db,
        cloudinary,
        options,
        allForms: loaded.forms,
        result,
        record,
      });
    } catch (error) {
      record('purge-form-soft-deleted', error);
    }
  }

  try {
    const cutoff = new Date(
      now.getTime() - options.staleFormMonths * 30 * 86400_000,
    ).toISOString();
    result.staleForms = (await db.listStaleForms(cutoff, options.batchSize)).length;
  } catch (error) {
    record('lapor-form-tidak-aktif', error);
  }

  return result;
}

/**
 * Fail-safe: keep-set tidak lengkap -> jangan pernah hapus orphan/purge.
 * @returns {Promise<{keep: Set<string>, forms: Array<{id: string, schema?: unknown}>} | null>}
 */
async function loadKeepSet(db, record) {
  try {
    const forms = await db.listAllFormSchemas();
    const keep = buildKeepSet({ imagePublicIds: await db.listAllImagePublicIds(), forms });
    return { keep, forms };
  } catch (error) {
    record('muat-keep-set', error);
    return null;
  }
}

async function deleteOrphans({ now, apply, cloudinary, options, keep, result, record }) {
  try {
    const assets = await cloudinary.listAssets({ maxPages: options.maxPages });
    const orphans = selectOrphans({
      assets,
      keep,
      now,
      minAgeHours: options.orphanMinAgeHours,
    }).slice(0, options.maxOrphans);
    result.orphans = orphans.length;
    if (!apply || orphans.length === 0) return;

    const statuses = await cloudinary.deleteAssets(orphans.map((asset) => asset.public_id));
    result.deletedOrphans = orphans.filter((asset) =>
      isDeletedStatus(statuses.get(asset.public_id)),
    ).length;
  } catch (error) {
    record('hapus-gambar-orphan', error);
  }
}
