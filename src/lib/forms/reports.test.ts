import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyReportAction, countPendingReports, listReports } from './reports';

describe('listReports', () => {
  it('memetakan data dan form summary dengan benar', async () => {
    const fakeData = [
      {
        id: 'rep-1',
        form_id: 'form-1',
        reason: 'Form meminta password',
        status: 'pending',
        created_at: '2026-10-22T10:00:00Z',
        resolved_at: null,
        resolved_by: null,
        action_taken: null,
        notes: null,
        forms: {
          id: 'form-1',
          title: 'Survei Akun',
          slug: 'survei-akun',
          status: 'published',
          owner_id: 'user-99',
        },
      },
    ];

    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: fakeData, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const list = await listReports(fakeClient);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('rep-1');
    expect(list[0].reason).toBe('Form meminta password');
    expect(list[0].status).toBe('pending');
    expect(list[0].form?.title).toBe('Survei Akun');
    expect(list[0].form?.slug).toBe('survei-akun');
  });

  it('mengembalikan array kosong jika query error', async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: null, error: { message: 'db error' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const list = await listReports(fakeClient);
    expect(list).toEqual([]);
  });
});

describe('countPendingReports', () => {
  it('mengembalikan angka count jika query berhasil', async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ count: 7, error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    const count = await countPendingReports(fakeClient);
    expect(count).toBe(7);
  });
});

describe('applyReportAction', () => {
  it('menyelesaikan laporan (resolve) dengan mencatat admin & notes', async () => {
    let updatePayload: Record<string, unknown> | null = null;
    const fakeClient = {
      from: (table: string) => ({
        update: (payload: Record<string, unknown>) => ({
          eq: () => {
            if (table === 'reports') updatePayload = payload;
            return Promise.resolve({ error: null });
          },
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await applyReportAction(fakeClient, {
      reportId: 'rep-1',
      action: 'resolve',
      adminUserId: 'admin-1',
      notes: 'Sudah diperingatkan',
    });

    expect(res.ok).toBe(true);
    expect(updatePayload).not.toBeNull();
    const payload = updatePayload as unknown as Record<string, unknown>;
    expect(payload.status).toBe('resolved');
    expect(payload.action_taken).toBe('resolve');
    expect(payload.resolved_by).toBe('admin-1');
    expect(payload.notes).toBe('Sudah diperingatkan');
  });

  it('menutup form sekaligus saat action close_form', async () => {
    let formUpdated = false;
    let reportUpdated = false;

    const fakeClient = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { form_id: 'form-bad-1' }, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, val: string) => {
            if (table === 'forms' && val === 'form-bad-1' && payload.status === 'closed') {
              formUpdated = true;
            }
            if (table === 'reports' && val === 'rep-2' && payload.status === 'resolved') {
              reportUpdated = true;
            }
            return Promise.resolve({ error: null });
          },
        }),
      }),
    } as unknown as SupabaseClient;

    const res = await applyReportAction(fakeClient, {
      reportId: 'rep-2',
      action: 'close_form',
      adminUserId: 'admin-1',
    });

    expect(res.ok).toBe(true);
    expect(formUpdated).toBe(true);
    expect(reportUpdated).toBe(true);
  });
});
