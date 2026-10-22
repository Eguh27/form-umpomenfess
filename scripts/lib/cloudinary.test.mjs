import { describe, expect, it } from 'vitest';
import { createCloudinaryAdmin, isDeletedStatus } from './cloudinary.mjs';

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => JSON.stringify(body) };
}

function createAdmin(fetchImpl) {
  return createCloudinaryAdmin({
    cloudName: 'demo-cloud',
    apiKey: 'key',
    apiSecret: 'secret',
    fetchImpl,
  });
}

describe('Cloudinary Admin API', () => {
  it('listPage memakai prefix, pagination, dan Basic Auth', async () => {
    const calls = [];
    const admin = createAdmin(async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        resources: [{ public_id: 'form/a', created_at: '2026-10-01T00:00:00Z' }],
        next_cursor: 'next',
      });
    });

    const result = await admin.listPage({ cursor: 'abc', maxResults: 100 });
    const url = new URL(calls[0].url);
    expect(url.pathname).toBe('/v1_1/demo-cloud/resources/image/upload');
    expect(url.searchParams.get('prefix')).toBe('form/');
    expect(url.searchParams.get('max_results')).toBe('100');
    expect(url.searchParams.get('next_cursor')).toBe('abc');
    expect(calls[0].init.headers.Authorization).toBe(
      `Basic ${Buffer.from('key:secret').toString('base64')}`,
    );
    expect(result.assets).toHaveLength(1);
    expect(result.nextCursor).toBe('next');
  });

  it('listAssets berhenti saat next_cursor null', async () => {
    let page = 0;
    const admin = createAdmin(async () => {
      page += 1;
      return jsonResponse({ resources: [{ public_id: `form/a${page}` }], next_cursor: null });
    });
    const assets = await admin.listAssets({ maxPages: 5, pageSize: 1 });
    expect(assets).toHaveLength(1);
    expect(page).toBe(1);
  });

  it('deleteAssets memfilter folder asing dan memecah batch 100', async () => {
    const calls = [];
    const ids = Array.from({ length: 101 }, (_, i) => `form/img-${i}`);
    const admin = createAdmin(async (url) => {
      calls.push(new URL(url));
      const requested = new URL(url).searchParams.getAll('public_ids[]');
      return jsonResponse({
        deleted: Object.fromEntries(requested.map((id) => [id, 'deleted'])),
      });
    });

    const statuses = await admin.deleteAssets([...ids, 'banner/luar', '../etc']);
    expect(calls).toHaveLength(2);
    expect(calls[0].searchParams.getAll('public_ids[]')).toHaveLength(100);
    expect(calls[1].searchParams.getAll('public_ids[]')).toHaveLength(1);
    expect(statuses.size).toBe(101);
    expect(statuses.get('form/img-0')).toBe('deleted');
    expect(statuses.has('banner/luar')).toBe(false);
  });

  it('error Cloudinary memakai pesan API, bukan body mentah', async () => {
    const admin = createAdmin(async () =>
      jsonResponse({ error: { message: 'Invalid credentials' } }, { ok: false, status: 401 }),
    );
    await expect(admin.deleteAssets(['form/x'])).rejects.toThrow(
      'Cloudinary menolak permintaan: Invalid credentials',
    );
  });
});

describe('status hapus', () => {
  it('menganggap deleted/not found sebagai aman dihapus', () => {
    expect(isDeletedStatus('deleted')).toBe(true);
    expect(isDeletedStatus('not found')).toBe(true);
    expect(isDeletedStatus('not_found')).toBe(true);
    expect(isDeletedStatus('error')).toBe(false);
    expect(isDeletedStatus(undefined)).toBe(false);
  });
});
