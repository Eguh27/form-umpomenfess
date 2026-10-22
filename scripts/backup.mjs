#!/usr/bin/env node
/** CLI backup mingguan (T-61). Default DRY-RUN; gunakan --apply untuk dump+unggah. */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { intOption, parseCli, rejectUnknownOptions } from './lib/cli.mjs';
import { ConfigError, readEnv, requireEnv } from './lib/env.mjs';
import { createSupabaseAdmin } from './lib/supabase-admin.mjs';
import { createBackupStorage } from './lib/backup-storage.mjs';
import { dumpPublicSchema, pgDumpVersion } from './lib/pg-dump.mjs';
import { BACKUP_DEFAULTS, runBackup } from './lib/backup-run.mjs';

const HELP = `Usage: node scripts/backup.mjs [opsi]

Opsi:
  --apply                 Lakukan dump + unggah (default: DRY-RUN)
  --json                  Cetak ringkasan JSON
  --bucket=NAMA           Bucket Storage privat (default env BACKUP_BUCKET / db-backups)
  --retention-days=N      Simpan backup selama N hari (default ${BACKUP_DEFAULTS.retentionDays}; 0 = nonaktif)
  --keep-latest=N         Selalu simpan N backup terbaru (default ${BACKUP_DEFAULTS.keepLatest})
  --help                  Tampilkan bantuan

Env: SUPABASE_URL (atau PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
     SUPABASE_DB_URL (connection string Postgres/Supavisor, bukan anon key).
Butuh pg_dump >= versi server. Muat env: node --env-file=.env.local scripts/backup.mjs ...
`;

const FLAGS = new Set(['apply', 'dry-run', 'json', 'help']);
const VALUES = ['bucket', 'retention-days', 'keep-latest'];

async function main() {
  const { flags, options: cliOptions, unknown } = parseCli(process.argv.slice(2));
  if (flags.has('help')) {
    console.log(HELP);
    return 0;
  }
  for (const flag of flags) {
    if (!FLAGS.has(flag)) throw new ConfigError(`flag tidak dikenal: --${flag}`);
  }
  rejectUnknownOptions(cliOptions, VALUES);
  if (unknown.length > 0) throw new ConfigError(`argumen tidak dikenal: ${unknown.join(' ')}`);
  if (flags.has('apply') && flags.has('dry-run')) {
    throw new ConfigError('pilih salah satu: --apply atau --dry-run');
  }

  const env = readEnv();
  requireEnv(env, ['supabaseUrl', 'serviceRoleKey', 'dbUrl']);
  const bucket = cliOptions.get('bucket') || env.backupBucket;
  const retentionDays = intOption(cliOptions, 'retention-days', BACKUP_DEFAULTS.retentionDays);
  const keepLatest = intOption(cliOptions, 'keep-latest', BACKUP_DEFAULTS.keepLatest);
  const apply = flags.has('apply');
  const pgVersion = await pgDumpVersion();

  let projectHost;
  try {
    projectHost = new URL(env.supabaseUrl).host;
  } catch {
    throw new ConfigError('SUPABASE_URL tidak valid');
  }

  const client = createSupabaseAdmin({ url: env.supabaseUrl, serviceRoleKey: env.serviceRoleKey });
  const summary = await runBackup({
    now: new Date(),
    apply,
    deps: {
      storage: createBackupStorage({ client, bucket }),
      dumper: { dump: (args) => dumpPublicSchema({ dbUrl: env.dbUrl, ...args }) },
      hashFile,
      makeTempDir: () => mkdtemp(join(tmpdir(), 'umpomenfess-backup-')),
      removeTempDir: (dir) => rm(dir, { recursive: true, force: true }),
    },
    options: {
      bucket,
      retentionDays,
      keepLatest,
      pgDumpVersion: pgVersion,
      projectHost,
    },
  });

  console.log(flags.has('json') ? JSON.stringify(summary, null, 2) : formatSummary(summary));
  return 0;
}

async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const info = await stat(path);
  return { sha256: hash.digest('hex'), bytes: info.size };
}

function formatSummary(summary) {
  const lines = [
    `Backup ${summary.at} — ${summary.dryRun ? 'DRY-RUN' : 'APPLY'}`,
    `- Bucket: ${summary.bucket}`,
    `- Objek: ${summary.key}`,
    `- Retensi: ${summary.retentionDays} hari (simpan minimal ${summary.keepLatest})`,
  ];
  if (summary.dryRun) {
    lines.push('- Tidak ada dump/unggah. Jalankan dengan --apply untuk mengeksekusi.');
  } else {
    lines.push(`- Ukuran: ${summary.bytes} byte`);
    lines.push(`- SHA-256: ${summary.sha256}`);
    lines.push(`- Objek lama dihapus: ${summary.removed}`);
  }
  return lines.join('\n');
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`backup gagal: ${error.message}`);
    process.exitCode = error instanceof ConfigError ? 2 : 1;
  });
