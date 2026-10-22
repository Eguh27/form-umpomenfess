import { describe, expect, it } from 'vitest';
import { isAdmin, parseAdminEmails } from './admin';

describe('parseAdminEmails', () => {
  it('memproses string kosong / null', () => {
    expect(parseAdminEmails('')).toEqual(new Set());
    expect(parseAdminEmails(null)).toEqual(new Set());
    expect(parseAdminEmails(undefined)).toEqual(new Set());
  });

  it('memisahkan koma dan men-trim spasi serta huruf kecil', () => {
    const set = parseAdminEmails(' Admin@umpo.ac.id, super@example.com ,  test@MOD.ID ');
    expect(set.has('admin@umpo.ac.id')).toBe(true);
    expect(set.has('super@example.com')).toBe(true);
    expect(set.has('test@mod.id')).toBe(true);
    expect(set.has('other@example.com')).toBe(false);
  });
});

describe('isAdmin', () => {
  it('menolak user null atau undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('mengizinkan user dengan role admin di app_metadata', () => {
    const user = {
      email: 'regular@example.com',
      app_metadata: { role: 'admin' },
    };
    expect(isAdmin(user, '')).toBe(true);
  });

  it('mengizinkan user jika email ada dalam whitelist ADMIN_EMAILS', () => {
    const user = {
      email: 'Boss@umpo.ac.id',
      app_metadata: { role: 'authenticated' },
    };
    expect(isAdmin(user, 'staff@umpo.ac.id, boss@umpo.ac.id')).toBe(true);
  });

  it('menolak user biasa yang tidak terdaftar', () => {
    const user = {
      email: 'user@example.com',
      app_metadata: { role: 'authenticated' },
    };
    expect(isAdmin(user, 'admin@umpo.ac.id')).toBe(false);
  });

  it('menolak user tanpa email dan tanpa admin role', () => {
    const user = {
      email: null,
      app_metadata: { role: 'authenticated' },
    };
    expect(isAdmin(user, 'admin@umpo.ac.id')).toBe(false);
  });
});
