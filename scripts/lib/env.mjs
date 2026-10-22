/** Pembacaan & validasi env skrip ops. Nilai secret tidak pernah dicetak. */

export class ConfigError extends Error {}

/**
 * @param {Record<string, string | undefined>} [source]
 */
export function readEnv(source = process.env) {
  const get = (name) => (source[name] ?? '').trim();
  return {
    supabaseUrl: get('SUPABASE_URL') || get('PUBLIC_SUPABASE_URL'),
    serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
    cloudName: get('CLOUDINARY_CLOUD_NAME'),
    cloudinaryApiKey: get('CLOUDINARY_API_KEY'),
    cloudinaryApiSecret: get('CLOUDINARY_API_SECRET'),
    dbUrl: get('SUPABASE_DB_URL'),
    backupBucket: get('BACKUP_BUCKET') || 'db-backups',
  };
}

/**
 * @param {ReturnType<typeof readEnv>} env
 * @param {(keyof ReturnType<typeof readEnv>)[]} required
 */
export function requireEnv(env, required) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(`env belum diisi: ${missing.join(', ')}`);
  }
}
