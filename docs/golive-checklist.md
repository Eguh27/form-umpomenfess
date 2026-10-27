# Checklist Go-Live — T-66 @L

- Pembuat: L · 2026-10-22 — untuk **manusia** yang mendorong produksi.
- Prinsip: env produksi diisi penuh; migrasi dijalankan SATU urutan; uji smoke
  tiap lapis; backup terbukti sebelum trafik nyata.
- □ Warisan Disaster recovery: `docs/restore.md` (@D). Akun Supabase/Cloudinary
  milik BARU project form ini (bukan menfess utama).

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

□ Nilai env serupa di Production & Preview
□ Tidak ada secret terselip di repo (`git grep` pola kunci)

## 2. Supabase — urutan migrasi (SQL Editor, urut nama file)

1. □ `20261021122500_init_schema.sql`
2. □ `20261021123000_rls_and_public_view.sql` (policy + view)
3. □ `20261021124000_seed_templates.sql` (5 template)
4. □ `20261022174000_submit_guard.sql` (kolom `client_token` + index unik + rpc `insert_response_guarded`)
5. [x] □ `20261022190000_seed_font_update.sql` (Poppins→Quicksand, Inter→system-ui) — **ekuivalen dieksekusi @L 2026-10-22 via REST** (4 baris PATCH, whitelist saat ini 0 font liar, verifikasi ulang PASS); berkas migrasi tetap boleh dijalankan manusia — idempoten, akan jadi no-op
6. □ `20261022200000_reports_moderation.sql` (kolom + constraint moderasi laporan)
7. □ `20261024213000_banner_data_url.sql` (kolom `forms.banner_data_url` + CHECK + view publik, T-74)
8. □ `20261025000000_archived_at.sql` (kolom `forms.archived_at` + index + view publik, E-A5)
9. [x] □ Verifikasi: `tests/rls.sql` 9/9 · `tests/submit_guard.sql` 8/8 (manusia) · whitelist font 0 liar (@L via REST) · `responses.client_token` ada · rpc `insert_response_guarded` merespons 200 `"form_tidak_tersedia"` utk form acu (signature: uuid version, answers, token?) — @L REST 2026-10-22
10. □ Verifikasi banner: `tests/banner_data_url.sql` (valid diterima; URL/SVG/oversize ditolak; view publik mengekspos kolom) — jalankan setelah migrasi 7
11. □ Verifikasi arsip: `tests/archived_at.sql` (kolom ada, view terekspos, index parsial aktif) — jalankan setelah migrasi 8
12. [x] □ Storage bucket `db-backups` dibuat **privat** — @L 2026-10-22 via storage API (public=false, verifikasi ulang PASS)

## 3. OAuth & domain

- □ Google Cloud Console: Redirect URI mengarah ke callback Supabase
  produksi (login Google dev sudah terverifikasi — ulang di prod)
- □ DNS: `form.umpomenfess.my.id` ↔ Vercel, HTTPS aktif
- □ `PUBLIC_SITE_URL` = domain produksi
- □ Supabase → Authentication → **URL Configuration** (INI yang menentukan
  tujuan akhir setelah login):
  - **Site URL** = `https://form.umpomenfess.my.id` — **bukan**
    `http://localhost:4321`. Site URL adalah fallback yang dipakai Supabase
    ketika `redirect_to` tidak cocok dengan allowlist, jadi Site URL localhost
    = pengguna dilempar ke localhost setelah login.
  - **Redirect URLs** (satu per baris):
    - `https://form.umpomenfess.my.id/auth/callback`
    - `http://localhost:4321/auth/callback` (dev)
    - `https://*.vercel.app/auth/callback` (preview deployment)
  - Verifikasi cepat: buka `/auth/login` di domain produksi; header
    `Location` harus berisi
    `redirect_to=https%3A%2F%2Fform.umpomenfess.my.id%2Fauth%2Fcallback`.
    Setelah callback Google dengan kode salah, Supabase harus tetap
    mengarah ke domain produksi (bukan localhost).

## 4. Workflow cron (GitHub Actions — cleanup & backup @D)

- □ Secrets workflow terisi (lihat notes @D di TASK 4.1: `SUPABASE_DB_URL`,
  key Storage privat, `CLOUDINARY_*` bila dibutuhkan cleanup)
- □ Dry-run workflow lewat dulu: log target benar, TIDAK ada aksi destruktif
- □ `npm run test:ops` lulus (34 test ops @D)
- □ Eksekusi nyata backup pertama + uji restore ke sandbox (ikuti `docs/restore.md`)
- □ Baru setelah itu cron mingguan dinyatakan aktif

## 5. Turnstile

- □ Kunci **produksi** (bukan test keys `1x000…` / `2x000…` / `3x000…`)
- □ Domain produksi + domain preview Vercel terdaftar (atau preview memakai
  test keys di env terpisah — jangan sampai kunci produksi tercampur "lintas env")

## 6. Smoke pasca-deploy (5 menit, urut)

1. □ `/` landing · `/login` → Google → balik ke `/dashboard` 200 dengan
   `cache-control: private, no-store`
2. □ Buat form dari template → **autosave sukses** (font seed sudah patched)
3. □ Upload banner → `public_id` `form/…` **tanpa** `form/form/…` (cek respons
   network + lokasi berkas di Media Library Cloudinary)
4. □ Publish → `/f/<slug>` render; widget Turnstile **muncul & aktif** (bukan
   teks "aktif setelah env diisi"); token terkirim bersama submit
5. □ Submit dummy → `terima-kasih` → halaman Respons + `Respons ✓` di builder;
   angka respons naik; CSV unduh pembuka di spreadsheet OK (BOM)
6. □ Klik-Kirim × 2 cepat → hanya 1 respons baru; klik kedua tetap lanjut ke
   terima-kasih (idempoten rpc)
7. □ Tombol Laporkan → `?err=lapor_ok` banner HIJAU (role=status)
8. □ Jalur gagal: payload > 64KB (`payload_besar`), captcha kosong
   (`captcha_belum_diisi`), ratelimit spam (10/menit)
9. □ Headers: CSP terkirim & 0 pelanggaran (build/preview — bukan dev);
   export.csv & 303 `no-store`

## 7. Keamanan & kebersihan repo (final gate)

- □ `tests/rls.sql` + `tests/submit_guard.sql` dieksekusi di DB produksi
- □ `docs/google.json` tidak lagi ada dalam repo (`git ls-files | grep -i google`)
- □ `supabase/.temp/` terabaikan git ✓ (gitignore @L 2026-10-22)
- □ Push branch → tag `v0.1.0` → deploy

## 8. Rollback / disaster

- DB: `docs/restore.md` (manifest sha256, retensi)
- App: redeploy commit sebelumnya di Vercel
- Spam bencana: dashboard CF + rate limit in-memory per instance + CF fallback
