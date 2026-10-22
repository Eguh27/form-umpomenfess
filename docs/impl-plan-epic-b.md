# Implementation Plan — Epic B: Panel Admin Moderasi Laporan

- Disusun @L · 2026-10-22 · Basis: `docs/epic-plan-roadmap.md` §BACKLOG Epic B
- Status: Rencana & Tiket Eksekusi Terkoordinasi

---

## 1. Overview & Business Value

- **Problem:** Responden dapat melaporkan form publik via tombol "Laporkan" di `/f/[slug]`. Namun, laporan yang masuk ke tabel `public.reports` saat ini hanya bisa dibaca dan ditindaklanjuti secara manual lewat SQL query di Supabase. Ini adalah risiko operasional harian tertinggi karena form berbahaya (phishing, meminta kata sandi, spam) tidak dapat segera dimoderasi dari antarmuka web.
- **Solution:** Membangun panel admin laporan di `/dashboard/admin/laporan` yang memungkinkan admin/moderator meninjau laporan, melihat detail form terlapor, menutup form bermasalah dengan satu klik, dan menandai laporan sebagai selesai (resolved) atau diabaikan (dismissed).
- **Security:**
  - Teks laporan (`reason`) berasal dari responden anonim dan berpotensi memuat script berbahaya: **wajib dirender sebagai teks polos (escaped)**, nol `set:html`.
  - Akses panel dan endpoint moderasi dibatasi ketat hanya untuk admin terotentikasi via `isAdmin(user)` (berbasis `ADMIN_EMAILS` atau `app_metadata.role === 'admin'`).
  - Menggunakan server-side service role client (`getSupabaseService()`) hanya di sisi server setelah otorisasi admin valid.

---

## 2. Stories Breakdown & Zones

| Story | Deskripsi | Peran / Zona | Est |
|---|---|---|---|
| **E-B1** | Skema & migrasi moderasi reports (`status`, `resolved_at`, `resolved_by`, `action_taken`, `notes`) + test SQL | **@A** (`supabase/migrations/**`, `tests/**`) | 0.5 hari |
| **E-B2** | Otorisasi admin `isAdmin(user)` + helper queries & actions moderasi laporan | **@A** & **@C** (`src/lib/auth/admin.ts`, `src/lib/forms/reports.ts`, test) | 0.5 hari |
| **E-B3** | Endpoint API moderasi aksi laporan `POST /api/admin/reports/[id]/action` | **@C** (`src/pages/api/admin/reports/[id]/action.ts`) | 0.25 hari |
| **E-B4** | Halaman UI Admin Panel Moderasi `/dashboard/admin/laporan` + integrasi navigasi dashboard | **@B** & **@D** (`src/pages/dashboard/admin/laporan.astro`, `src/components/builder/AdminReports.tsx`) | 0.5 hari |

---

## 3. Data Contract

### Migrasi `20261022200000_reports_moderation.sql`:
```sql
alter table public.reports
  add column if not exists status text not null default 'pending'
    constraint reports_status_check check (status in ('pending', 'resolved', 'dismissed')),
  add column if not exists resolved_at timestamptz null,
  add column if not exists resolved_by uuid null references auth.users (id) on delete set null,
  add column if not exists action_taken text null
    constraint reports_action_check check (action_taken in ('form_closed', 'dismissed', 'resolved')),
  add column if not exists notes text null;

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
```

### Otorisasi:
- Environment variable: `ADMIN_EMAILS="admin@example.com,moderator@example.com"`
- Helper: `isAdmin(user: { email?: string; app_metadata?: { role?: string } } | null): boolean`

---

## 4. Acceptance Criteria

- [ ] Migrasi skema reports tersusun idempoten (`if not exists`) dan disertai test SQL.
- [ ] Helper `isAdmin` memiliki unit test lengkap (email match, whitespace, case-insensitivity, role admin, null user).
- [ ] Endpoint `POST /api/admin/reports/[id]/action` menolak non-admin dengan status 403, dan memproses aksi: `close_form` (menutup form + resolve laporan), `resolve`, `dismiss`.
- [ ] Halaman `/dashboard/admin/laporan` hanya dapat dibuka oleh admin; non-admin dialihkan atau diberi 403.
- [ ] Alasan laporan (`reason`) dirender aman (escaped).
- [ ] Tombol pintasan moderasi tampil di dashboard jika user terdeteksi sebagai admin.
- [ ] Seluruh unit test, lint, Astro check, dan build sukses tanpa error.
