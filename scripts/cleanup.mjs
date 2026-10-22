#!/usr/bin/env node
/** CLI cleanup (T-60). Default DRY-RUN; gunakan --apply untuk mengubah data. */

import { intOption, parseCli, rejectUnknownOptions } from './lib/cli.mjs';
import { ConfigError, readEnv, requireEnv } from './lib/env.mjs';
import { createSupabaseAdmin } from './lib/supabase-admin.mjs';
import { createCleanupDb } from './lib/cleanup-db.mjs';
import { createCloudinaryAdmin } from './lib/cloudinary.mjs';
import { CLEANUP_DEFAULTS, runCleanup } from './lib/cleanup-run.mjs';
import { formatCleanupSummary } from './lib/cleanup-report.mjs';

const HELP = `Usage: node scripts/cleanup.mjs [opsi]

Opsi:
  --weekly                Jalankan tugas harian + mingguan (default: harian)
  --apply                 Terapkan perubahan (default: DRY-RUN)
  --json                  Cetak ringkasan JSON
  --tmp-ttl-hours=N       Umur maks gambar tmp (default ${CLEANUP_DEFAULTS.tmpTtlHours})
  --soft-delete-days=N    Retensi form soft-deleted (default ${CLEANUP_DEFAULTS.softDeleteRetentionDays})
  --orphan-min-age-hours=N  Umur minimum aset sebelum dianggap orphan (default ${CLEANUP_DEFAULTS.orphanMinAgeHours})
  --stale-form-months=N   Ambang laporan form tidak aktif (default ${CLEANUP_DEFAULTS.staleFormMonths})
  --batch-size=N          Batas baris per langkah (default ${CLEANUP_DEFAULTS.batchSize})
  --max-orphans=N         Batas orphan dihapus sekali jalan (default ${CLEANUP_DEFAULTS.maxOrphans})
  --max-pages=N           Batas halaman listing Cloudinary (default ${CLEANUP_DEFAULTS.maxPages})
  --help                  Tampilkan bantuan

Env: SUPABASE_URL (atau PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
     CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
Muat .env.local: node --env-file=.env.local scripts/cleanup.mjs ...
`;

const FLAGS = new Set(['apply', 'dry-run', 'weekly', 'json', 'help']);
const VALUES = [
  'tmp-ttl-hours',
  'soft-delete-days',
  'orphan-min-age-hours',
  'stale-form-months',
  'batch-size',
  'max-orphans',
  'max-pages',
];

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
  requireEnv(env, [
    'supabaseUrl',
    'serviceRoleKey',
    'cloudName',
    'cloudinaryApiKey',
    'cloudinaryApiSecret',
  ]);

  const options = {
    ...CLEANUP_DEFAULTS,
    tmpTtlHours: intOption(cliOptions, 'tmp-ttl-hours', CLEANUP_DEFAULTS.tmpTtlHours),
    softDeleteRetentionDays: intOption(
      cliOptions,
      'soft-delete-days',
      CLEANUP_DEFAULTS.softDeleteRetentionDays,
    ),
    orphanMinAgeHours: intOption(
      cliOptions,
      'orphan-min-age-hours',
      CLEANUP_DEFAULTS.orphanMinAgeHours,
    ),
    staleFormMonths: intOption(
      cliOptions,
      'stale-form-months',
      CLEANUP_DEFAULTS.staleFormMonths,
    ),
    batchSize: intOption(cliOptions, 'batch-size', CLEANUP_DEFAULTS.batchSize, {
      min: 1,
      max: 5000,
    }),
    maxOrphans: intOption(cliOptions, 'max-orphans', CLEANUP_DEFAULTS.maxOrphans, {
      min: 1,
      max: 5000,
    }),
    maxPages: intOption(cliOptions, 'max-pages', CLEANUP_DEFAULTS.maxPages, {
      min: 1,
      max: 100,
    }),
  };

  const apply = flags.has('apply');
  const mode = flags.has('weekly') ? 'weekly' : 'daily';
  const client = createSupabaseAdmin({ url: env.supabaseUrl, serviceRoleKey: env.serviceRoleKey });
  const summary = await runCleanup({
    now: new Date(),
    apply,
    mode,
    db: createCleanupDb(client),
    cloudinary: createCloudinaryAdmin({
      cloudName: env.cloudName,
      apiKey: env.cloudinaryApiKey,
      apiSecret: env.cloudinaryApiSecret,
    }),
    options,
  });

  console.log(flags.has('json') ? JSON.stringify(summary, null, 2) : formatCleanupSummary(summary));
  return summary.errors.length > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`cleanup gagal: ${error.message}`);
    process.exitCode = error instanceof ConfigError ? 2 : 1;
  });
