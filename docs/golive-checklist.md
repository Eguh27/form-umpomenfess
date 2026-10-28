# Checklist Go-Live — T-66 @L

- Pembuat: L · 2026-10-22 — Diperbarui & ditutup: 2026-10-28 pasca-T68.
- Prinsip: env produksi diisi penuh; migrasi dijalankan SATU urutan; uji smoke
  tiap lapis; backup terbukti sebelum trafik nyata.
- [x] Warisan Disaster recovery: `docs/restore.md` (@D). Akun Supabase/Cloudinary
  milik BARU project form ini (bukan menfess utama).
- Laporan verifikasi komprehensif: `docs/review-golive-verification.md`.

## 1. Env produksi (Vercel → Settings → Environment Variables)

Set **Production + Preview**. Nama sesuai TASK 4.1 (server-only TANPA prefix `PUBLIC_`).

| Env | Sumber | Catatan |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | bukan secret |
| `PUBLIC_SUPABASE_ANON_KEY` | idem (publishable/anon) | bukan secret |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (secret/service_role) | server only — master, bypass RLS |
| `CLOUDINARY_CLOUD_NAME` | console.cloudinary.com → Dashboard | akun baru milik project form |
| `CLOUDINARY_API_KEY` | Cloudinary → Settings → Access Keys | server only |
| `CLOUDINARY_API_SECRET` | idem → API Secret | server only |
| `TURNSTILE_SITE_KEY` | dash.cloudflare.com → Turnstile (site **produksi** + localhost utk preview) | dipas ke HTML oleh server (bukan secret) |
| `TURNSTILE_SECRET_KEY` | idem | server only |
| `PUBLIC_SITE_URL` | `https://form.umpomenfess.my.id` | metadata build |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string | GitHub Secret workflow backup (BUKAN Vercel) |
| `BACKUP_BUCKET` | opsional (default `db-backups`) | bucket Storage wajib privat |

- [x] Nilai env serupa di Production & Preview
- [x] Tidak ada secret terselip di repo (`npm run audit:security` lolos, 0 secret di bundle)

## 2. Supabase — urutan migrasi (SQL Editor, urut nama file)

1. [x] `20261021122500_init_schema.sql`
2. [x] `20261021123000_rls_and_public_view.sql` (policy + view)
3. [x] `20261021124000_seed_templates.sql` (5 template)
4. [x] `20261022174000_submit_guard.sql` (kolom `client_token` + index unik + rpc `insert_response_guarded`)
5. [x] `20261022190000_seed_font_update.sql` (Poppins→Quicksand, Inter→system-ui) — dieksekusi @L via REST (4 baris PATCH, whitelist 0 font liar, verifikasi PASS)
6. [x] `20261022200000_reports_moderation.sql` (kolom + constraint moderasi laporan)
7. [x] `20261024213000_banner_data_url.sql` (kolom `forms.banner_data_url` + CHECK + view publik, T-74)
8. [x] `20261025000000_archived_at.sql` (kolom `forms.archived_at` + index + view publik, E-A5)
9. [x] `20261028104500_public_forms_readonly.sql` (FIX KRITIS: `security_invoker=on`, policy SELECT published **anon saja**, grant kolom minimum, cabut hak tulis view) — telah diterapkan di produksi
10. [x] Verifikasi: `tests/rls.sql` 9/9 · `tests/submit_guard.sql` 8/8 · `tests/public_forms_readonly.sql` PASS · whitelist font 0 liar · `responses.client_token` ada · rpc `insert_response_guarded` aktif
11. [x] Verifikasi banner: `tests/banner_data_url.sql` (valid diterima; URL/SVG/oversize ditolak; view publik mengekspos kolom) — PASS
12. [x] Verifikasi arsip: `tests/archived_at.sql` (kolom ada, view terekspos, index parsial aktif) — PASS
13. [x] Storage bucket `db-backups` dibuat **privat** — `public=false`, verifikasi PASS

## 3. OAuth & domain

- [x] Google Cloud Console: Redirect URI mengarah ke callback Supabase produksi
- [x] DNS: `form.umpomenfess.my.id` ↔ Vercel, HTTPS aktif
- [x] `PUBLIC_SITE_URL` = domain produksi
- [x] Supabase → Authentication → **URL Configuration**:
  - **Site URL** = `https://umpomenfess.my.id` / `https://form.umpomenfess.my.id`
  - **Redirect URLs**:
    - `https://form.umpomenfess.my.id/auth/callback` (produksi)
    - `http://localhost:4321/auth/callback` (dev)
    - `https://*-eguh-s-projects.vercel.app/auth/callback` (preview Vercel)
  - Verifikasi: `/auth/login` redirect ke domain publik, fallback verify 303 benar.

## 4. Workflow cron (GitHub Actions — cleanup & backup @D)

- [x] Secrets workflow terisi (`SUPABASE_DB_URL`, key Storage privat, `CLOUDINARY_*`)
- [x] Dry-run workflow lewat: log target benar, TIDAK ada aksi destruktif (`scripts/cleanup.mjs` PASS)
- [x] `npm run test:ops` lulus (34 test ops @D)
- [x] Prosedur disaster recovery tervalidasi (`docs/restore.md` & `docs/review-golive-verification.md`)
- [x] Cron mingguan siap aktif

## 5. Turnstile

- [x] Kunci **produksi** terkonfigurasi
- [x] Domain produksi + domain preview Vercel terdaftar
- [x] Fail-closed terverifikasi: submit tanpa token captcha otomatis ditolak `?err=captcha_belum_diisi`

## 6. Smoke pasca-deploy (5 menit, urut)

1. [x] `/` landing · `/login` → Google → balik ke `/dashboard` 200 dengan `cache-control: private, no-store`
2. [x] Buat form dari template → **autosave sukses** (font seed sudah patched)
3. [x] Upload banner → `public_id` `form/…` **tanpa** `form/form/…`
4. [x] Publish → `/f/<slug>` render; widget Turnstile muncul & aktif; token terkirim bersama submit
5. [x] Submit dummy → `terima-kasih` → halaman Respons + `Respons ✓` di builder; angka respons naik; CSV unduh pembuka di spreadsheet OK (BOM)
6. [x] Klik-Kirim × 2 cepat → hanya 1 respons baru; klik kedua tetap lanjut ke terima-kasih (idempoten rpc)
7. [x] Tombol Laporkan → `?err=lapor_ok` banner HIJAU (role=status)
8. [x] Jalur gagal: payload > 64KB (`payload_besar`), captcha kosong (`captcha_belum_diisi`), ratelimit spam (10/menit)
9. [x] Headers: CSP terkirim & 0 pelanggaran; export.csv & 303 `no-store`
10. [x] Sesi login (T-80): login **tanpa** "Ingat saya" → cookie `sb-…-auth-token` tanpa `Max-Age`/`Expires`, tutup jendela browser → tetap di `/login`; login **dengan** "Ingat saya 30 hari" → `Max-Age≈2592000` + `umpf_ingat=1`, sesi bertahan; logout menghapus keduanya.

## 7. Keamanan & kebersihan repo (final gate)

- [x] `tests/rls.sql` + `tests/submit_guard.sql` + `tests/public_forms_readonly.sql` dieksekusi di DB
- [x] E3: `PUBLIC_SUPABASE_ANON_KEY` ber-role `anon`; bundle client tidak memuat `role=service_role` (`npm run audit:security` PASS); anon REST tidak bisa membaca `responses`. Rotasi service key P0 direkomendasikan pada Supabase Dashboard.
- [x] View `public_forms` read-only: anon bisa SELECT form published, tetapi `UPDATE`/`DELETE` lewat view ditolak; `security_invoker=on` dan hak tulis view sudah dicabut (migrasi `20261028104500`)
- [x] `docs/google.json` tidak ada dalam repo (`git ls-files | grep -i google` bersih)
- [x] `supabase/.temp/` terabaikan git ✓ (gitignore @L 2026-10-22)
- [x] Health monitoring diperkuat (`/api/health?deep=1` active connectivity checks + CI smoke test)
- [x] Push branch → tag `v0.1.0` → deploy

## 8. Rollback / disaster

- DB: `docs/restore.md` (manifest sha256, retensi, all-or-nothing transaction)
- App: redeploy commit sebelumnya di Vercel
- Spam bencana: dashboard CF + rate limit in-memory per instance + CF fallback
