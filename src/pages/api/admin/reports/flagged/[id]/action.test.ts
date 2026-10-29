import { describe, expect, it } from 'vitest';
import { POST } from './action';

describe('POST /api/admin/reports/flagged/[id]/action', () => {
  it('menolak request jika belum login (401)', async () => {
    const res = await POST({
      params: { id: 'form-1' },
      locals: { user: null },
      request: new Request('http://localhost/api/admin/reports/flagged/form-1/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'close_form' }),
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('harus_login');
  });

  it('menolak request jika user bukan admin (403)', async () => {
    const res = await POST({
      params: { id: 'form-1' },
      locals: { user: { id: 'user-biasa', email: 'user@example.com' } },
      request: new Request('http://localhost/api/admin/reports/flagged/form-1/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'close_form' }),
      }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('akses_ditolak');
  });

  it('menolak aksi yang tidak valid (400)', async () => {
    const res = await POST({
      params: { id: 'form-1' },
      locals: {
        user: {
          id: 'admin-1',
          email: 'admin@umpo.ac.id',
          app_metadata: { role: 'admin' },
        },
      },
      request: new Request('http://localhost/api/admin/reports/flagged/form-1/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete_everything' }),
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('aksi_tidak_valid');
  });

  it('menolak jika payload json korup (400)', async () => {
    const res = await POST({
      params: { id: 'form-1' },
      locals: {
        user: {
          id: 'admin-1',
          email: 'admin@umpo.ac.id',
          app_metadata: { role: 'admin' },
        },
      },
      request: new Request('http://localhost/api/admin/reports/flagged/form-1/action', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json{{{',
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('payload_tidak_valid');
  });
});
