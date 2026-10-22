# E-A1 Implementation Plan — formId pada sign → cap gambar eksak per-form

- Plan @L · 2026-10-22 · Sumber: seksi 4/11/12 dari `docs/epic-plan-roadmap.md`
  (EPIC-A). Adaptasi tanpa Jira: **tiket = seksi "Ticket Body" di berkas ini**
  (self-contained — cukup satu berkas ini utk eksekusi; pola sesuai workflow
  generate-implementation-plan).
- Status publish: dikommit ke docs/ (mapping "Confluence").

## Summary

| Metric | Value |
|---|---|
| **Epic** | EPIC-A — MVP → Produksi Stabil v1.0 (`docs/epic-plan-roadmap.md`) |
| **Total Story** | 1 (E-A1, tanpa split — ±3 pts) |
| **Overall Complexity** | Low (semua file tepi, pola tersedia, tidak ada migrasi) |
| **Execution Waves** | 1 (backend dulu, lalu client — urut, tidak paralel) |
| **Key Dependencies** | tidak ada (komponen sudah hidup; legacy path dipertahankan) |

## Completion Status

| Story | Status | Date | Notes |
|---|---|---|---|
| E-A1 (Ticket Body di bawah) | Pending | — | Klaim di TODO.md dulu per protokol AGENTS |

## Execution Order & Wave

| # | Story | Ringkas | Pts | Risk | Deps | Zone |
|---|---|---|---|---|---|---|
| 1 | E-A1 | formId → cap eksak | 3 | Low | — | C lalu B (1 wave) |

**Agent mapping (repo):** endpoint/server = **@C**; island/klien = **@B**.
Wajib: `git add` hanya zona masing-masing + progress.md; eksekusi urut
(backend dulu — klien aman terhadap endpoint lama karena field opsional).

---

# Ticket Body — E-A1 (self-contained)

## Summary

`POST /api/uploads/sign` menerima opsional `formId` (uuid): validasi milik
(session-RLS), catat `form_images.form_id` saat lahir, dan batas upload jadi
**eksak `maxImagesPerForm` (5) per form** — buhan lagi interim 2×per-owner.
Klien lama tanpa `formId` tetap jalan via jalur legacy (cap interim tetap).

## Implementation Steps

1. **Modul helper baru** `src/lib/forms/imageSignGuard.ts` (zona C) — logika
   validasi & cap dipisah agar teruji (pola seperti `guardedInsert.ts`):
   ```ts
   export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

   /** formId opsional → {ok, formId} atau alasan tolak. 404 generik utk
    * form yg bukan milik/bukan ada (anti probing, konsisten dgn export.csv). */
   export async function resolveOwnedFormId(
     supabase: SupabaseClient, raw: unknown,
   ): Promise<{ ok: true; formId: string } | { ok: false; reason: 'payload' | 'form_tidak_dikenal' }>;

   /** Cap: formId diberisi → count baris milik FORM (semua state) vs maxImages
    * (eksak); formId null → legacy (tmp per owner, cap 2×max). */
   export async function checkImageCap(
     supabase: SupabaseClient,
     args: { formId: string | null; ownerId: string; maxImages: number },
   ): Promise<{ allowed: boolean; count: number; exact: boolean; reason?: string }>;
   ```
   Query cap eksak: `.from('form_images').select('id',{count:'exact',head:true})
   .eq('form_id', formId)` — tanpa filter owner (baris form sudah
   terjamin milik user oleh resolve di atas; RLS tetap berlaku).
   Legacy: `.eq('owner_id', ownerId).eq('state','tmp')`, batas `2×max`.

2. **Endpoint** `src/pages/api/uploads/sign.ts` (zona C):
   - `SignBody` + `formId?: unknown`.
   - Setelah `checkFile`: `resolveOwnedFormId(supabase, body.formId)` —
     gagal → `jsonError('payload_tidak_valid',400)` /
     `jsonError('form_tidak_dikenal',404)`.
   - Ganti blok count lama dgn `checkImageCap` → gagal → kode legacy
     `terlalu_banyak_upload_tmp` bila legacy, `terlalu_banyak_upload_form`
     bila eksak (429).
   - INSERT row: tambah `form_id: formId` (null utk legacy).
   - Komentar header endpoint diperbarui (hapus kalimat "menyusul").

3. **Klien** `src/components/builder/BannerUpload.tsx` (zona B):
   - `Props` + `formId?: string` → body `JSON.stringify({ bytes, mime, formId })`
     (hanya saat tidak kosong — backwards-compat jelas).
   - Map pesan `terlalu_banyak_upload_form` → "Batas 5 gambar per form
     tercapai." (error code 429 dilempar sederhana: cukup status).

4. **Wiring prop** `ThemePanel.tsx` + `Editor.tsx` (zona B):
   - `ThemePanel` props + `formId?: string`; `BannerUpload` menerima; Editor
     meneruskan `formId={formId}` (sudah dimiliki Editor).

Out-of-scope (catatan): uploader utk blok `image` belum ada di UI — masuk
Epic-D (Editor tingkat 2); param Cloudinary `folder` TIDAK diubah (docs:
diabaikan bila public_id berpath —sigel @L di Requests).

## Files to Modify

| File | Action | Deskripsi |
|---|---|---|
| `src/lib/forms/imageSignGuard.ts` | CREATE | validasi formId + cap (teruji murni) |
| `src/pages/api/uploads/sign.ts` | MODIFY | pakai helper; insert form_id; pesan 429 |
| `src/components/builder/BannerUpload.tsx` | MODIFY | kirim formId; map pesan cap |
| `src/components/builder/ThemePanel.tsx` | MODIFY | props formId turun ke BannerUpload |
| `src/components/builder/Editor.tsx` | MODIFY | teruskan formId ke ThemePanel |
| `src/lib/forms/imageSignGuard.test.ts` | CREATE | test murni helper |
| `docs/uji-manual.md` | MODIFY | §4 diperluas dgn cek cap eksak |

## Tests (siap tempel)

### File: `src/lib/forms/imageSignGuard.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkImageCap, resolveOwnedFormId, UUID_RE } from './imageSignGuard';

/** Fake query chain: select({...}).eq/v...(acak) → objek taksel/thenable. */
const fake = <T,>(result: { data?: T | null; error?: unknown; count?: number }) => {
  type C = Record<string, unknown> & PromiseLike<{ data: unknown; error: unknown; count: number }>;
  const build = (): C => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }),
    };
    chain.then = (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? 0 }).then(res) as unknown;
    return chain as C;
  };
  const client = { from: () => build() };
  return client as unknown as SupabaseClient;
};

describe('UUID_RE', () => {
  it('uuid benar rows; sembrono ditolak', () => {
    expect(UUID_RE.test('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(UUID_RE.test('../../etc')).toBe(false);
    expect(UUID_RE.test('')).toBe(false);
  });
});

describe('resolveOwnedFormId — milik diputuskan RLS (klien user)', () => {
  it('raw bukan string → payload (bukan query)', async () => {
    const guard = await resolveOwnedFormId(fake({ data: null }), null);
    expect(guard).toMatchObject({ ok: false, reason: 'payload' });
  });

  it('raw format salah → payload', async () => {
    const guard = await resolveOwnedFormId(fake({ data: null }), 'bukan-uuid');
    expect(guard).toMatchObject({ ok: false, reason: 'payload' });
  });

  it('uuid & baris ada (RLS) → ok dgn id', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const guard = await resolveOwnedFormId(fake({ data: { id } }), id);
    expect(guard).toMatchObject({ ok: true, formId: id });
  });

  it('uuid tapi tak milik (RLS null) → form_tidak_dikenal (404 generik)', async () => {
    const guard = await resolveOwnedFormId(
      fake({ data: null }),
      '11111111-1111-1111-1111-111111111111',
    );
    expect(guard).toMatchObject({ ok: false, reason: 'form_tidak_dikenal' });
  });
});

describe('checkImageCap — eksak per-form vs legacy per-owner', () => {
  it('eksak: count >= max → ditolak dgn exact=true', async () => {
    const res = await checkImageCap(fake({ count: 5 }), {
      formId: '11111111-1111-1111-1111-111111111111', ownerId: 'o', maxImages: 5,
    });
    expect(res).toMatchObject({ allowed: false, count: 5, exact: true });
  });

  it('eksak: di bawah batas → boleh', async () => {
    const res = await checkImageCap(fake({ count: 4 }), {
      formId: '11111111-1111-1111-1111-111111111111', ownerId: 'o', maxImages: 5,
    });
    expect(res).toMatchObject({ allowed: true, count: 4, exact: true });
  });

  it('legacy: formId null → cap 2×max utk tmp per owner', async () => {
    const res = await checkImageCap(fake({ count: 10 }), {
      formId: null, ownerId: 'owner-x', maxImages: 5,
    });
    expect(res).toMatchObject({ allowed: false, count: 10, exact: false, reason: 'terlalu_banyak_upload_tmp' });
  });
});
```

### SQL manusia (opsional, kecil) — `tests/sign_form_modal.sql` (skip kalau redundant)
Endpoint-level sudah dicek via unit + uji manual §4; tidak perlu file SQL baru.

## Error code kontrak (TASK 4.6 diperkaya)

| Kode | Status | Makna |
|---|---|---|
| `harus_login` | 401 | tetap |
| `payload_tidak_valid` | 400 | tetap / formId format salah |
| `berkas_ditolak:<alasan>` | 400 | tetap |
| `form_tidak_dikenal` | **404** | formId tak milik user / tidak ada (probing akur) |
| `terlalu_banyak_upload_form` | **429** | cap eksak 5/form tercapai |
| `terlalu_banyak_upload_tmp` | 429 | legacy path tetap |

## Acceptance Criteria

- [ ] `imageSignGuard.test.ts` lulus (unit murni, fake client pola repo)
- [ ] Endpoint: formId milik lain → 404 generik; cap eksak 6/5 → 429 kode baru
- [ ] Legacy (tanpa formId) masih berjalan (cap 2× per owner, insert form_id null)
- [ ] UI banner di Editor mengirim formId (devtools body terlihat formId)
- [ ] `npm test` + `test:ops` + lint/check/build hijau
- [ ] `docs/uji-manual.md` §4 diperbarui (cap eksak + 404 probing)
- [ ] TODO.md & `docs/progress.md` diperbarui per protokol (klaim/selesai)

---

## Document Links

- **Overview:** `docs/epic-plan-roadmap.md` · **Review:** `docs/review-security.md`,
  `docs/review-race-T63.md` · **Kontrak:** TASK 4.6 (diperkaya via progress note,
  perubahan tang include error code baru → CONTRACT CHANGE wajib dicatat executor
  bila menambah kode err di TASK).
