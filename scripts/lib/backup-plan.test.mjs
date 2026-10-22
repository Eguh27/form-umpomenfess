import { describe, expect, it } from 'vitest';
import {
  backupKey,
  buildManifest,
  checksumText,
  selectExpiredBackups,
} from './backup-plan.mjs';

describe('nama objek backup', () => {
  it('deterministik, urut secara leksikografis, di folder weekly/', () => {
    const key = backupKey(new Date('2026-10-22T03:15:00.000Z'));
    expect(key).toBe('weekly/umpomenfess-20261022t031500z.dump');
  });

  it('checksum mengikuti format sha256sum', () => {
    expect(checksumText({ sha256: 'abc123', fileName: 'x.dump' })).toBe('abc123  x.dump\n');
  });
});

describe('manifest backup', () => {
  it('memuat metadata restore tanpa data sensitif', () => {
    const manifest = buildManifest({
      key: 'weekly/umpomenfess-20261022t031500z.dump',
      now: new Date('2026-10-22T03:15:00.000Z'),
      bytes: 1024,
      sha256: 'abc123',
      pgDumpVersion: 'pg_dump (PostgreSQL) 17.6',
      projectHost: 'abcdefghijk.supabase.co',
      retentionDays: 90,
    });
    expect(manifest).toMatchObject({
      format: 'pg_dump-custom',
      schema: 'public',
      bytes: 1024,
      sha256: 'abc123',
      retentionDays: 90,
    });
    expect(JSON.stringify(manifest)).not.toContain('key');
    expect(manifest.excludes.length).toBeGreaterThan(0);
  });
});

describe('retensi backup', () => {
  const files = [
    { path: 'weekly/umpomenfess-20260701t000000z.dump' },
    { path: 'weekly/umpomenfess-20260701t000000z.dump.sha256' },
    { path: 'weekly/umpomenfess-20260701t000000z.dump.json' },
    { path: 'weekly/umpomenfess-20260801t000000z.dump' },
    { path: 'weekly/umpomenfess-20260901t000000z.dump' },
    { path: 'weekly/umpomenfess-20261020t000000z.dump' },
  ];

  it('menghapus dump lama di luar retensi, menyisakan N terbaru + companion-nya', () => {
    const result = selectExpiredBackups(files, {
      now: new Date('2026-10-22T00:00:00.000Z'),
      retentionDays: 30,
      keepLatest: 2,
    });
    expect(result.dumps).toEqual([
      'weekly/umpomenfess-20260701t000000z.dump',
      'weekly/umpomenfess-20260801t000000z.dump',
    ]);
    expect(result.companions).toEqual([
      'weekly/umpomenfess-20260701t000000z.dump.sha256',
      'weekly/umpomenfess-20260701t000000z.dump.json',
    ]);
  });

  it('retentionDays=0 menonaktifkan penghapusan', () => {
    const result = selectExpiredBackups(files, {
      now: new Date('2026-10-22T00:00:00.000Z'),
      retentionDays: 0,
      keepLatest: 1,
    });
    expect(result).toEqual({ dumps: [], companions: [] });
  });
});
