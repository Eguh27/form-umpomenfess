/** Orkestrasi backup mingguan (T-61): dump -> hash -> unggah -> verifikasi -> retensi. */

import { join } from 'node:path';
import {
  backupFileName,
  backupKey,
  buildManifest,
  checksumText,
  selectExpiredBackups,
} from './backup-plan.mjs';

export const BACKUP_DEFAULTS = {
  retentionDays: 90,
  keepLatest: 8,
};

/**
 * @param {object} args
 * @param {Date} args.now
 * @param {boolean} args.apply
 * @param {object} args.deps
 * @param {object} args.options
 */
export async function runBackup({ now, apply, deps, options }) {
  const key = backupKey(now);
  const fileName = backupFileName(key);
  const base = {
    at: now.toISOString(),
    key,
    bucket: options.bucket,
    retentionDays: options.retentionDays,
    keepLatest: options.keepLatest,
  };
  if (!apply) return { ...base, dryRun: true };

  await deps.storage.ensureBucket();
  const tempDir = await deps.makeTempDir();
  try {
    const dumpPath = join(tempDir, fileName);
    await deps.dumper.dump({ outFile: dumpPath });
    const { sha256, bytes } = await deps.hashFile(dumpPath);

    const manifest = buildManifest({
      key,
      now,
      bytes,
      sha256,
      pgDumpVersion: options.pgDumpVersion,
      projectHost: options.projectHost,
      retentionDays: options.retentionDays,
    });

    await deps.storage.uploadFile(key, dumpPath, 'application/octet-stream');
    await deps.storage.uploadText(`${key}.sha256`, checksumText({ sha256, fileName }));
    await deps.storage.uploadText(`${key}.json`, JSON.stringify(manifest, null, 2));

    const info = await deps.storage.info(key);
    if (!info || Number(info.size) !== bytes) {
      throw new Error('verifikasi unggah gagal: ukuran objek di Storage tidak cocok');
    }

    const removed = await pruneOldBackups(deps.storage, { now, options });
    return { ...base, dryRun: false, bytes, sha256, removed };
  } finally {
    await deps.removeTempDir(tempDir);
  }
}

/**
 * @param {object} storage
 * @param {{now: Date, options: object}} args
 */
export async function pruneOldBackups(storage, { now, options }) {
  const files = await storage.list('weekly');
  const expired = selectExpiredBackups(files, {
    now,
    retentionDays: options.retentionDays,
    keepLatest: options.keepLatest,
  });
  const paths = [...expired.dumps, ...expired.companions];
  if (paths.length === 0) return 0;
  return storage.remove(paths);
}
