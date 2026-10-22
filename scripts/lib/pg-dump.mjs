/** Jalankan pg_dump untuk schema public (T-61). Tidak pernah mencetak DB URL. */

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DUMP_TIMEOUT_MS = 10 * 60 * 1000;

function missingToolError(bin) {
  return new Error(
    `${bin} tidak ditemukan. Pasang postgresql-client (versi >= server Supabase), ` +
      'mis. `sudo apt-get install postgresql-client-17`.',
  );
}

/** @param {string} [bin] */
export async function pgDumpVersion(bin = 'pg_dump') {
  try {
    const { stdout } = await execFileAsync(bin, ['--version'], { timeout: 15_000 });
    return stdout.trim();
  } catch (error) {
    if (error?.code === 'ENOENT') throw missingToolError(bin);
    throw new Error(`gagal menjalankan ${bin} --version`, { cause: error });
  }
}

/**
 * @param {{dbUrl: string, outFile: string, bin?: string}} args
 */
export async function dumpPublicSchema({ dbUrl, outFile, bin = 'pg_dump' }) {
  const args = [
    '--format=custom',
    '--schema=public',
    '--no-owner',
    `--file=${outFile}`,
    `--dbname=${dbUrl}`,
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: DUMP_TIMEOUT_MS,
    });
    let stderr = '';
    child.stderr.on('data', (buffer) => {
      if (stderr.length < 4000) stderr += buffer.toString();
    });
    child.on('error', (error) => {
      reject(
        error?.code === 'ENOENT'
          ? missingToolError(bin)
          : new Error('gagal spawn pg_dump', { cause: error }),
      );
    });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      const safeMessage = stderr.split(dbUrl).join('<db-url>').trim().slice(0, 500);
      reject(new Error(`pg_dump gagal (exit ${code})${safeMessage ? `: ${safeMessage}` : ''}`));
    });
  });
}
