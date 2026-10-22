import { describe, expect, it } from 'vitest';
import { createBackupStorage } from './backup-storage.mjs';

function fakeClient({ existing = null, createError = null } = {}) {
  const calls = { created: [] };
  return {
    calls,
    storage: {
      async getBucket() {
        return existing ? { data: existing, error: null } : { data: null, error: { message: 'not found' } };
      },
      async createBucket(name, options) {
        calls.created.push({ name, options });
        return { data: createError ? null : { name }, error: createError };
      },
    },
  };
}

describe('bucket backup', () => {
  it('menolak bucket yang sudah publik', async () => {
    const storage = createBackupStorage({
      client: fakeClient({ existing: { name: 'db-backups', public: true } }),
      bucket: 'db-backups',
    });
    await expect(storage.ensureBucket()).rejects.toThrow(/publik/);
  });

  it('menerima bucket privat yang sudah ada', async () => {
    const client = fakeClient({ existing: { name: 'db-backups', public: false } });
    const storage = createBackupStorage({ client, bucket: 'db-backups' });
    await expect(storage.ensureBucket()).resolves.toBeUndefined();
    expect(client.calls.created).toEqual([]);
  });

  it('membuat bucket privat bila belum ada', async () => {
    const client = fakeClient();
    const storage = createBackupStorage({ client, bucket: 'db-backups' });
    await storage.ensureBucket();
    expect(client.calls.created).toEqual([
      { name: 'db-backups', options: { public: false } },
    ]);
  });
});
