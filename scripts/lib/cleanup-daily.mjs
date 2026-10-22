/** Tugas cleanup harian: tutup form kedaluwarsa + hapus gambar tmp. */

import { isDeletedStatus } from './cloudinary.mjs';
import { isManagedPublicId } from './public-id.mjs';

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {boolean} args.apply
 * @param {object} args.db
 * @param {object} args.cloudinary
 * @param {object} args.options
 * @param {object} args.result
 * @param {(step: string, error: unknown) => void} args.record
 */
export async function runDaily({ now, apply, db, cloudinary, options, result, record }) {
  try {
    const expired = await db.listExpiredForms(now.toISOString(), options.batchSize);
    result.expiredForms = expired.length;
    if (apply && expired.length > 0) {
      result.closedForms = await db.closeForms(
        expired.map((form) => form.id),
        now.toISOString(),
      );
    }
  } catch (error) {
    record('tutup-form-kedaluwarsa', error);
  }

  try {
    const cutoff = new Date(now.getTime() - options.tmpTtlHours * 3600_000).toISOString();
    const rows = await db.listTmpImages(cutoff, options.batchSize);
    result.tmpImages = rows.length;
    if (!apply || rows.length === 0) return;

    const safeRows = rows.filter((row) => isManagedPublicId(row.public_id));
    const invalidRows = rows.filter((row) => !isManagedPublicId(row.public_id));
    let statuses = new Map();
    if (safeRows.length > 0) {
      statuses = await cloudinary.deleteAssets(safeRows.map((row) => row.public_id));
    }
    const removable = [
      ...invalidRows,
      ...safeRows.filter((row) => isDeletedStatus(statuses.get(row.public_id))),
    ];
    result.deletedTmpImages = await db.deleteImageRows(removable.map((row) => row.id));
  } catch (error) {
    record('hapus-gambar-tmp', error);
  }
}
