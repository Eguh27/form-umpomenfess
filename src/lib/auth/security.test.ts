import { describe, expect, it } from 'vitest';
import { isAdmin } from './admin';
import { csvCell } from '../forms/csv';
import { isManagedPublicId } from '../../../scripts/lib/public-id.mjs';

describe('Security Invariants & Anti-Regression Guards', () => {
  it('E3 Guard: Anon key dan Service Role key tidak boleh identik', () => {
    const env = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env ?? {};
    const anon = (import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? env.PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
    const service = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

    if (anon && service) {
      expect(anon).not.toBe(service);
      expect(anon.length).toBeGreaterThan(10);
      expect(service.length).toBeGreaterThan(10);
    }
  });

  it('CSV Injection Guard: formula Excel berisiko di-escape dengan kutip tunggal', () => {
    const dangerous = ['=cmd|', '+1+2', '-10*5', '@SUM(A1:A10)', '\tmalicious', '\rCRLF'];
    for (const val of dangerous) {
      const cell = csvCell(val);
      expect(cell.startsWith('"\'')).toBe(true);
      expect(cell.endsWith('"')).toBe(true);
    }
    expect(csvCell('Jawaban Aman')).toBe('"Jawaban Aman"');
  });

  it('Asset Namespace Guard: publicId wajib berada di bawah namespace form/', () => {
    expect(isManagedPublicId('form/sample-image')).toBe(true);
    expect(isManagedPublicId('form/sub/image')).toBe(true);
    expect(isManagedPublicId('external/image')).toBe(false);
    expect(isManagedPublicId('../image')).toBe(false);
    expect(isManagedPublicId('root-image')).toBe(false);
  });

  it('Admin Authorization Guard: role admin hanya diberikan ke admin sah', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({})).toBe(false);
    expect(isAdmin({ app_metadata: { role: 'user' } })).toBe(false);
    expect(isAdmin({ app_metadata: { role: 'admin' } })).toBe(true);
    expect(isAdmin({ email: 'admin@umpomenfess.my.id' }, 'admin@umpomenfess.my.id')).toBe(true);
  });
});
