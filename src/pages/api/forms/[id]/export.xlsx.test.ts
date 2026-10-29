import { describe, expect, it } from 'vitest';
import { GET } from './export.xlsx';

describe('GET /api/forms/[id]/export.xlsx', () => {
  it('menolak ID bukan UUID dengan 404', async () => {
    const res = await GET({
      params: { id: 'invalid-not-uuid' },
      request: new Request('http://localhost/api/forms/invalid-not-uuid/export.xlsx'),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('form_tidak_tersedia');
  });

  it('menolak ID kosong dengan 404', async () => {
    const res = await GET({
      params: { id: '' },
      request: new Request('http://localhost/api/forms//export.xlsx'),
    });
    expect(res.status).toBe(404);
  });
});
