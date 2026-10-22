import { describe, expect, it, vi } from 'vitest';
import { POST } from '../../pages/auth/email';
import type { APIContext } from 'astro';

vi.mock('../../lib/auth/supabase', () => ({
  getEnvConfig: vi.fn(() => ({ url: 'https://example.supabase.co', anonKey: 'anon-key-123' })),
  createBufferedClient: vi.fn(() => {
    return {
      supabase: {
        auth: {
          signInWithPassword: vi.fn(async ({ email, password }) => {
            if (password === 'correct123') {
              return { data: { user: { id: 'u1', email } }, error: null };
            }
            return { data: null, error: new Error('Invalid login credentials') };
          }),
          signUp: vi.fn(async ({ email, password }) => {
            if (password.length >= 6) {
              return { data: { user: { id: 'u2', email }, session: null }, error: null };
            }
            return { data: null, error: new Error('Password should be at least 6 characters') };
          }),
          resetPasswordForEmail: vi.fn(async () => {
            return { data: {}, error: null };
          }),
        },
      },
      flush: (res: Response) => res,
    };
  }),
}));

describe('/auth/email endpoint', () => {
  it('login gagal bila kredensial salah, redirect ke /login dengan error kredensial_salah', async () => {
    const formData = new FormData();
    formData.set('action', 'login');
    formData.set('email', 'test@example.com');
    formData.set('password', 'wrongpass');

    const req = new Request('http://localhost:4321/auth/email', {
      method: 'POST',
      body: formData,
    });

    const ctx = {
      request: req,
      url: new URL('http://localhost:4321/auth/email'),
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    } as unknown as APIContext;

    const res = await POST(ctx);
    expect(res.headers.get('Location')).toContain('error=kredensial_salah');
  });

  it('login sukses mengarahkan ke /dashboard dengan status 303', async () => {
    const formData = new FormData();
    formData.set('action', 'login');
    formData.set('email', 'test@example.com');
    formData.set('password', 'correct123');

    const req = new Request('http://localhost:4321/auth/email', {
      method: 'POST',
      body: formData,
    });

    const ctx = {
      request: req,
      url: new URL('http://localhost:4321/auth/email'),
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    } as unknown as APIContext;

    const res = await POST(ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/dashboard');
  });

  it('signup menolak password kurang dari 6 karakter', async () => {
    const formData = new FormData();
    formData.set('action', 'signup');
    formData.set('email', 'new@example.com');
    formData.set('password', '123');

    const req = new Request('http://localhost:4321/auth/email', {
      method: 'POST',
      body: formData,
    });

    const ctx = {
      request: req,
      url: new URL('http://localhost:4321/auth/email'),
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    } as unknown as APIContext;

    const res = await POST(ctx);
    expect(res.headers.get('Location')).toContain('error=password_pendek');
  });

  it('signup valid mengarahkan ke konfirmasi email jika butuh konfirmasi', async () => {
    const formData = new FormData();
    formData.set('action', 'signup');
    formData.set('email', 'new@example.com');
    formData.set('password', 'securepass123');
    formData.set('fullName', 'Budi Santoso');

    const req = new Request('http://localhost:4321/auth/email', {
      method: 'POST',
      body: formData,
    });

    const ctx = {
      request: req,
      url: new URL('http://localhost:4321/auth/email'),
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    } as unknown as APIContext;

    const res = await POST(ctx);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toContain('msg=konfirmasi_email');
  });

  it('forgot password mengirimkan tautan reset', async () => {
    const formData = new FormData();
    formData.set('action', 'forgot');
    formData.set('email', 'user@example.com');

    const req = new Request('http://localhost:4321/auth/email', {
      method: 'POST',
      body: formData,
    });

    const ctx = {
      request: req,
      url: new URL('http://localhost:4321/auth/email'),
      redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
    } as unknown as APIContext;

    const res = await POST(ctx);
    expect(res.headers.get('Location')).toContain('msg=reset_terkirim');
  });
});
