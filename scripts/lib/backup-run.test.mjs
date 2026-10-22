import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBackup } from './backup-run.mjs';

const now = new Date('2026-10-22T03:15:00.000Z');
const options = {
  bucket: 'db-backups',
  retentionDays: 90,
  keepLatest: 8,
  pgDumpVersion: 'pg_dump (PostgreSQL) 17.6',
  projectHost: 'abcdefghijk.supabase.co',
};

async function hashFile(path) {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  const info = await stat(path);
  return { sha256: hash.digest('hex'), bytes: info.size };
}

function fakeStorage(files = []) {
  const calls = { ensured: 0, uploads: [], texts: [], removed: [], infoKey: null };
  return {
    calls,
    async ensureBucket() {
      calls.ensured += 1;
    },
    async uploadFile(key, filePath) {
      calls.uploads.push({ key, filePath });
    },
    async uploadText(key, text) {
      calls.texts.push({ key, text });
    },
    async info(key) {
      calls.infoKey = key;
      const uploaded = calls.uploads.find((item) => item.key === key);
      if (!uploaded) return null;
      return { size: (await stat(uploaded.filePath)).size };
    },
    async list() {
      return files;
    },
    async remove(paths) {
      calls.removed.push(paths);
      return paths.length;
    },
  };
}

function deps({ storage, dumpError = null } = {}) {
  const calls = { dumped: 0, tempRemoved: 0 };
  return {
    calls,
    storage,
    dumper: {
      async dump({ outFile }) {
        calls.dumped += 1;
        if (dumpError) throw dumpError;
        await writeFile(outFile, 'dump-data');
      },
    },
    hashFile,
    makeTempDir: () => mkdtemp(join(tmpdir(), 'umpomenfess-test-')),
    removeTempDir: async (dir) => {
      calls.tempRemoved += 1;
      await rm(dir, { recursive: true, force: true });
    },
  };
}

describe('backup dry-run', () => {
  it('tidak membuat dump / menyentuh Storage', async () => {
    const storage = fakeStorage();
    const d = deps({ storage });
    const summary = await runBackup({ now, apply: false, deps: d, options });

    expect(summary).toMatchObject({
      dryRun: true,
      key: 'weekly/umpomenfess-20261022t031500z.dump',
      bucket: 'db-backups',
    });
    expect(d.calls.dumped).toBe(0);
    expect(storage.calls.ensured).toBe(0);
    expect(storage.calls.uploads).toEqual([]);
  });
});

describe('backup apply', () => {
  it('dump -> sha256 -> unggah 3 objek -> verifikasi -> retensi', async () => {
    const old = { path: 'weekly/umpomenfess-20200101t000000z.dump' };
    const storage = fakeStorage([old]);
    const d = deps({ storage });
    const summary = await runBackup({
      now,
      apply: true,
      deps: d,
      options: { ...options, keepLatest: 0 },
    });

    expect(d.calls.dumped).toBe(1);
    expect(storage.calls.ensured).toBe(1);
    expect(storage.calls.uploads).toHaveLength(1);
    expect(storage.calls.infoKey).toBe(summary.key);
    expect(storage.calls.texts.map((item) => item.key)).toEqual([
      `${summary.key}.sha256`,
      `${summary.key}.json`,
    ]);

    const manifest = JSON.parse(storage.calls.texts[1].text);
    expect(manifest.bytes).toBe(summary.bytes);
    expect(manifest.sha256).toBe(summary.sha256);
    expect(manifest.projectHost).toBe('abcdefghijk.supabase.co');
    expect(storage.calls.removed).toEqual([[old.path]]);
    expect(d.calls.tempRemoved).toBe(1);
  });

  it('ukuran objek tidak cocok -> error, temp tetap dibersihkan', async () => {
    const storage = fakeStorage();
    storage.info = async () => ({ size: 1 });
    const d = deps({ storage });

    await expect(runBackup({ now, apply: true, deps: d, options })).rejects.toThrow(
      /verifikasi unggah gagal/,
    );
    expect(d.calls.tempRemoved).toBe(1);
  });
});
