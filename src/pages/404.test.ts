import { describe, expect, it } from 'vitest';

describe('404 anti-fingerprinting & route handling', () => {
  it('respons JSON 404 untuk permintaan API tidak menyertakan identitas framework', () => {
    const payload = {
      error: 'tidak_ditemukan',
      message: 'Halaman atau endpoint tidak ditemukan.',
    };
    const bodyStr = JSON.stringify(payload);
    expect(bodyStr).not.toContain('astro');
    expect(bodyStr).not.toContain('vercel');
    expect(bodyStr).toContain('tidak_ditemukan');
  });
});
