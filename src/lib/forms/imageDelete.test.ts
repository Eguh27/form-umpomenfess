import { describe, expect, it, vi } from 'vitest';
import { deleteCloudinaryAsset, isValidPublicId } from './imageDelete';

describe('isValidPublicId', () => {
  it('menerima format valid dengan prefix form/', () => {
    expect(isValidPublicId('form/abc123_xyz')).toBe(true);
    expect(isValidPublicId('form/banner-sample')).toBe(true);
  });

  it('menolak format tanpa form/ atau yang mencurigakan', () => {
    expect(isValidPublicId('samples/image')).toBe(false);
    expect(isValidPublicId('form/')).toBe(false);
    expect(isValidPublicId('')).toBe(false);
    expect(isValidPublicId('../evil')).toBe(false);
    expect(isValidPublicId('https://evil.com/x.jpg')).toBe(false);
  });
});

describe('deleteCloudinaryAsset', () => {
  const config = {
    cloudName: 'test-cloud',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
  };

  it('menolak publicId tidak valid tanpa memanggil fetch', async () => {
    const fetchMock = vi.fn();
    const result = await deleteCloudinaryAsset('invalid_id', config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('public_id_tidak_valid');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('berhasil jika Cloudinary merespons status deleted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: { 'form/banner1': 'deleted' } }),
    });

    const result = await deleteCloudinaryAsset('form/banner1', config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('deleted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.cloudinary.com/v1_1/test-cloud/resources/image/upload?public_ids[]=form%2Fbanner1');
    expect(init.method).toBe('DELETE');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('test-key:test-secret')}`);
  });

  it('menganggap not_found sebagai berhasil (karena gambar sudah tidak ada)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: { 'form/banner1': 'not_found' } }),
    });

    const result = await deleteCloudinaryAsset('form/banner1', config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('not_found');
  });

  it('mengembalikan error jika response HTTP tidak ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid credentials' } }),
    });

    const result = await deleteCloudinaryAsset('form/banner1', config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  it('mengembalikan error jika fetch mengalami exception / network error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network offline'));
    const result = await deleteCloudinaryAsset('form/banner1', config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network offline');
  });
});
