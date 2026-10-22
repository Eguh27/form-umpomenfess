/** Orkestrasi cleanup (T-60). Destruktif hanya saat `apply`; default dry-run. */

import { runDaily } from './cleanup-daily.mjs';
import { runWeekly } from './cleanup-weekly.mjs';

export const CLEANUP_DEFAULTS = {
  tmpTtlHours: 24,
  softDeleteRetentionDays: 30,
  orphanMinAgeHours: 24,
  staleFormMonths: 6,
  batchSize: 500,
  maxOrphans: 500,
  maxPages: 10,
};

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {boolean} args.apply
 * @param {'daily'|'weekly'} args.mode
 * @param {ReturnType<import('./cleanup-db.mjs').createCleanupDb>} args.db
 * @param {ReturnType<import('./cloudinary.mjs').createCloudinaryAdmin>} args.cloudinary
 * @param {typeof CLEANUP_DEFAULTS} args.options
 */
export async function runCleanup({ now, apply, mode, db, cloudinary, options }) {
  const summary = {
    at: now.toISOString(),
    mode,
    apply,
    daily: {
      expiredForms: 0,
      closedForms: 0,
      tmpImages: 0,
      tmpImagesInUse: 0,
      deletedTmpImages: 0,
    },
    weekly: null,
    errors: [],
  };

  const record = (step, error) => {
    summary.errors.push({
      step,
      message: error instanceof Error ? error.message : String(error),
    });
  };

  await runDaily({ now, apply, db, cloudinary, options, result: summary.daily, record });
  if (mode === 'weekly') {
    summary.weekly = await runWeekly({ now, apply, db, cloudinary, options, record });
  }
  return summary;
}
