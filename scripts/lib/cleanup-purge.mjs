/** Hard delete form soft-deleted > retensi, beserta aset Cloudinary-nya. */

import { isDeletedStatus } from './cloudinary.mjs';
import { buildKeepSet, formAssetIds } from './cleanup-plan.mjs';

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {boolean} args.apply
 * @param {object} args.db
 * @param {object} args.cloudinary
 * @param {object} args.options
 * @param {Array<{id: string, schema?: unknown}>} args.allForms
 * @param {object} args.result
 * @param {(step: string, error: unknown) => void} args.record
 */
export async function purgeSoftDeleted({
  now,
  apply,
  db,
  cloudinary,
  options,
  allForms,
  result,
  record,
}) {
  const cutoff = new Date(
    now.getTime() - options.softDeleteRetentionDays * 86400_000,
  ).toISOString();
  const forms = await db.listSoftDeletedForms(cutoff, options.batchSize);
  result.softDeletedForms = forms.length;
  if (!apply || forms.length === 0) return;

  const images = await db.listImagesForForms(forms.map((form) => form.id));
  const imagesByForm = new Map();
  for (const row of images) {
    if (!imagesByForm.has(row.form_id)) imagesByForm.set(row.form_id, []);
    imagesByForm.get(row.form_id).push(row);
  }

  const assetsFor = (form) =>
    formAssetIds({ schema: form.schema, imageRows: imagesByForm.get(form.id) ?? [] });
  // Aset bisa dipakai bersama oleh form duplikat: jangan hapus jika form lain masih merujuk.
  const purgeIds = new Set(forms.map((form) => form.id));
  const shared = buildKeepSet({ forms: allForms.filter((form) => !purgeIds.has(form.id)) });

  const deletableIds = forms.flatMap(assetsFor).filter((id) => !shared.has(id));
  const statuses = await cloudinary.deleteAssets(deletableIds);

  // Form hanya dihapus jika semua asetnya hilang ATAU masih dipakai form lain.
  const purgeable = forms.filter((form) =>
    assetsFor(form).every((id) => shared.has(id) || isDeletedStatus(statuses.get(id))),
  );
  if (purgeable.length === 0) return;

  const candidates = new Set(purgeable.map((form) => form.id));
  const imageRowIds = images.filter((row) => candidates.has(row.form_id)).map((row) => row.id);
  try {
    result.purgedImages = await db.deleteImageRows(imageRowIds);
    result.purgedForms = await db.deleteForms(purgeable.map((form) => form.id));
  } catch (error) {
    record('hard-delete-form', error);
  }
}
