/** Logika murni backup: nama objek, manifest, dan retensi. */

const DUMP_PREFIX = 'weekly';
const DUMP_NAME_RE = /umpomenfess-(\d{8})t(\d{6})z\.dump$/;

/** @param {Date} now */
export function backupKey(now) {
  const iso = now.toISOString(); // 2026-10-22T12:34:56.789Z
  const compact = `${iso.slice(0, 10).replaceAll('-', '')}t${iso.slice(11, 19).replaceAll(':', '')}z`;
  return `${DUMP_PREFIX}/umpomenfess-${compact}.dump`;
}

/** @param {string} key */
export function backupFileName(key) {
  return key.split('/').pop() ?? key;
}

/**
 * @param {{sha256: string, fileName: string}} args
 */
export function checksumText({ sha256, fileName }) {
  return `${sha256}  ${fileName}\n`;
}

/**
 * @param {object} args
 * @param {string} args.key
 * @param {Date} args.now
 * @param {number} args.bytes
 * @param {string} args.sha256
 * @param {string} args.pgDumpVersion
 * @param {string} args.projectHost
 * @param {number} args.retentionDays
 */
export function buildManifest(args) {
  return {
    format: 'pg_dump-custom',
    schema: 'public',
    object: args.key,
    createdAt: args.now.toISOString(),
    bytes: args.bytes,
    sha256: args.sha256,
    pgDumpVersion: args.pgDumpVersion,
    projectHost: args.projectHost,
    retentionDays: args.retentionDays,
    excludes: ['auth.users (dikelola Supabase Auth)', 'aset Cloudinary (biner terpisah)'],
  };
}

/** @param {string} path */
function backupTimeFromPath(path) {
  const match = DUMP_NAME_RE.exec(path);
  if (!match) return NaN;
  const [, date, time] = match;
  return Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
    Number(time.slice(0, 2)),
    Number(time.slice(2, 4)),
    Number(time.slice(4, 6)),
  );
}

/**
 * Pilih dump yang boleh dihapus: lebih tua dari retensi DAN bukan N terbaru.
 * @param {Array<{path: string, created_at?: string}>} files
 * @param {{now: Date, retentionDays: number, keepLatest: number}} options
 */
export function selectExpiredBackups(files, { now, retentionDays, keepLatest }) {
  const dumps = files
    .filter((file) => file.path.endsWith('.dump'))
    .sort((a, b) => a.path.localeCompare(b.path));
  if (retentionDays <= 0 || dumps.length === 0) return { dumps: [], companions: [] };

  const keepCount = Math.max(0, keepLatest);
  const protectedPaths = new Set(
    keepCount > 0 ? dumps.slice(-keepCount).map((file) => file.path) : [],
  );
  const cutoff = now.getTime() - retentionDays * 86400_000;
  const expired = dumps.filter((file) => {
    if (protectedPaths.has(file.path)) return false;
    const created = backupTimeFromPath(file.path);
    const fallback = Date.parse(file.created_at ?? '');
    const timestamp = Number.isFinite(created) ? created : fallback;
    return Number.isFinite(timestamp) && timestamp < cutoff;
  });

  const existing = new Set(files.map((file) => file.path));
  const companions = expired
    .flatMap((file) => [`${file.path}.sha256`, `${file.path}.json`])
    .filter((path) => existing.has(path));
  return { dumps: expired.map((file) => file.path), companions };
}
