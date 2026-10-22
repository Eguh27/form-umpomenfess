# TODO.md — Papan Tugas Multi-Agent (Form Builder)

Legenda: `[ ]` belum | `[~] @peran tgl-jam` dikerjakan | `[x]` selesai | `[!]` blocked
Aturan klaim/selesai: lihat AGENTS.md bagian 3. Edit hanya barismu; baca ulang file sebelum edit.

## Persiapan manusia (sebelum agent jalan)
- [ ] Buat repo baru (mis. `umpomenfess-form`) dan push isi folder project ini, project Vercel baru, tambah domain `form.umpomenfess.my.id` (CNAME di DNS)
- [ ] Akun BARU: Supabase (project baru) dan Cloudinary; buat Cloudflare Turnstile site
- [ ] Aktifkan Google OAuth di Supabase Auth
- [ ] Isi env di `.env.local` dan di Vercel (jangan commit)
- [ ] Salin dari repo menfess ke `design/reference/`: file CSS/token (warna, font, radius), logo, contoh komponen header/footer/kartu
- [ ] Salin AGENTS.md, TASK.md, TODO.md ini ke root repo; buat folder `docs/`

## Cara menjalankan agent
Satu tab terminal per peran, opencode di repo yang SAMA. Prompt pembuka:

> Kamu agent **A** (db/auth). Baca AGENTS.md, TASK.md, TODO.md, docs/progress.md. Klaim tugas `[ ]` pertama yang dependensinya sudah `[x]` untuk perananmu, kerjakan, update TODO.md + progress.md, lalu ambil tugas berikutnya. Berhenti bila tidak ada tugas yang bisa diambil.

Ganti peran: B (builder), C (public), D (design/ops), R (reviewer), L (lead).

## Gelombang
- Wave 0: L sendirian (setup + audit)
- Wave 1: A, C (validator/schema), D (design tokens) paralel
- Wave 2: B (builder + dashboard) dan C (halaman publik, submit, respons) paralel
- Wave 3: D (cleanup/backup) + R (review) + uji akhir

---

## Wave 0 — Setup (L)
- [x] T-00 @L 2026-10-21-21:23 SISA: Astro+TS+adapter Vercel sudah terpasang (lihat docs/audit.md). Tinggal: pilih framework island (satu saja), pasang lint/test runner, catat di `docs/audit.md`
- [x] T-01 @L Struktur folder sesuai zona di AGENTS.md; sesuaikan tabel zona bila berbeda
- [x] T-02 @L Buat `docs/progress.md` dan `src/lib/config/limits.ts` (konstanta limit)

## Wave 1 (butuh T-02)
### A (db/auth)
- [x] T-10 @A 2026-10-21-22:20 Migrasi `forms`, `form_images`, `responses`, `reports`, `templates` (+ kolom `tier`)
- [x] T-11 @A 2026-10-21-22:25 RLS sesuai TASK 4.4 + view/RPC form publik
- [x] T-12 @A 2026-10-22-02:45 Test RLS (user A vs B, publik) dengan skrip/SQL — dieksekusi manusia via SQL Editor, tanpa error (9 ketentuan lolos)
- [x] T-13 @A 2026-10-22-02:00 Login Google via Supabase Auth + helper session SSR + proteksi `/dashboard` — verifikasi manual login Google localhost oleh manusia 2026-10-22 ✅
- [x] T-14 @A 2026-10-21-22:43 Seed template awal (5-10) dan data dummy

### C (schema/validator dulu)
- [x] T-20 @C 2026-10-21-21:40 `src/lib/forms/schema.ts`: tipe + validator zod sesuai TASK 4.5 (whitelist font/cardStyle/warna)
- [x] T-21 @C 2026-10-21-22:05 Unit test validator (nilai di luar whitelist ditolak, ID duplikat ditolak, batas jumlah blok/pertanyaan)

### D (design)
- [x] T-30 @D 2026-10-22-10:35 tokens asli "Kaca · Blush" dari referensi SVG + skema dark `[data-theme]` + design/README.md
- [x] T-31 @D 2026-10-22-10:35 Layout dasar (header/footer/tombol/kartu) selaras situs menfess, mobile-first — diverifikasi browser (light+dark, 390px, 0 error console)
- [x] T-32 @D 2026-10-22-10:35 Preset kartu `menfess|plain|soft` + util kontras WCAG `src/lib/design/contrast.ts` + test token (43 test lulus)

## Wave 2
### B (builder + dashboard; butuh T-13, T-20, T-31)
- [x] T-40 @B 2026-10-22-10:50 Dashboard selesai: island `DashboardForms` + halaman server (list RLS + count respons, buat kosong/template, duplikat schema utuh, tutup, soft delete) — 58 test lulus; verifikasi visual island menunggu login manusia (middleware redirect betul di browser)
- [x] T-41 @B 2026-10-22-10:57 Builder inti: island Editor + BlockList (up/down/hapus/tambah) + BlockPanel/ThemePanel + autosave 1.5s HANYA dengan schema valid + state/history/serialize teruji — diverifikasi browser (tambah blok, panel, preview live update)
- [~] T-42 @B 2026-10-22-10:57 Upload banner/gambar — UI client + rules teruji SELESAI; live flow masuk Blocked (endpoint @C)
- [x] T-43 @B 2026-10-22-10:57 Preview HP/desktop + undo/redo (stack 50) + peringatan otomatis label sensitif + tombol publish (validasi dulu, versi++) — publish live menunggu sesi manusia
- [x] T-44 @B 2026-10-22-10:57 Test builder: 88 test (9 file) — serialize → parseFormSchema selalu valid / issues; teks user murni string (escape di render); tidak ada input HTML mentah di UI

### C (public; butuh T-12, T-20, T-31)
- [x] T-50 @C 2026-10-22-14:20 Halaman `/f/[slug]`: render schema + tema aman (escape), mobile-first, catatan privasi, tombol Laporkan
- [x] T-51 @C 2026-10-22-14:20 `POST /api/forms/[slug]/submit`: validasi, Turnstile fail-closed, rate limit per-IP, kuota/tanggal tutup, idempoten lembut client_token (mint @A kolom utk idempotence kuat)
- [x] T-52 @C 2026-10-22-14:20 Halaman terima kasih + penanganan form tutup/penuh/tidak ditemukan
- [x] T-53 @C 2026-10-22-14:20 Halaman respons (tabel+ringkasan) + `export.csv` anti CSV-injection — halaman dipinjam path zona B (minta ratifikasi @L, tautan dari builder minta @B)
- [x] T-54 @C 2026-10-22-14:20 Test 125 lulus: submit nakal, replay token, IDOR export (404 prosaik), CSV injection, rate limit, Turnstile mock, sign SHA-1

## Wave 3
- [x] T-60 @D 2026-10-22 12:45 Workflow cleanup harian/mingguan (tmp, orphan, soft-deleted > 30 hari) dengan mode dry-run — `scripts/cleanup.mjs` + 2 workflow; 29 test ops; default DRY-RUN
- [x] T-61 @D 2026-10-22 12:45 Backup mingguan di luar repo + `docs/restore.md` — `scripts/backup.mjs` (pg_dump → Supabase Storage privat, sha256+manifest+retensi) + workflow; belum dieksekusi nyata, tunggu secrets/DB URL
- [x] T-62 @R 2026-10-22-16:05 Review keamanan -> `docs/review-security.md` — 1 TINGGI (Turnstile script hilang), 2 SEDANG (publicIdPattern lsp., payload chunked), 6 RENDAH; 7 area WS-R senantiasa aman dgn bukti
- [x] T-63 @R 2026-10-22-16:05 Review race -> `docs/review-race-T63.md` — R1 TOCTOU kuota (rpc @A), R2 idempotensi 3-lapis + urutan replay (sebelum captcha), R3/R4 map memori; R6-R8 info/oke
- [x] T-64 @C 2026-10-22-17:15 (bagian zona C dari tugas multi-zone): S1 script Turnstile, S2 wajib folder form/, S3 cek byte FormData, S4/R3 cap map, S5 banner sukses, S6 no-store redirect, R2b replay sebelum captcha, R4 evict FIFO, koreksi judul test — 132 test + lint/check/build hijau; bagian @C BERAKHIR di sini
- [x] T-64 @A 2026-10-22-17:55 (bagian zona A): migrasi `20261022174000_submit_guard.sql` (kolom client_token + partial unique index + rpc `insert_response_guarded` FOR UPDATE/kuota/dup fast-path) + `tests/submit_guard.sql` (8 assertion, rollback) + endpoint C memakai rpc dgn fallback legacy otomatis (gagal_db/42883) - 139 test & gates hijau. ✅ migrasi telah dieksekusi manusia + uji SQL 8/8 lulus → rpc AKTIF di endpoint submit (fallback legacy tak terpakai)
- [x] SISA T-64 @B 2026-10-22-18:45: `imagesUsed.ts` — tiap simpanan editor menandai publicId yang direferensi (blok image + banner) `form_images` tmp→used + form_id (RLS owner, 6 test unit); `Cache-Control: private, no-store` di ketiga halaman dashboard (index, [id], respons) — 145 test + gates hijau. **T-64 KOMPLET di semua zona** — tinggal uji visual manusia + push
- [ ] T-65 @L Uji end-to-end dummy lalu uji di HP dengan beberapa teman
- [ ] T-66 @L Checklist go-live (manusia): env production, domain, Turnstile production, backup aktif, cron dari dry-run ke nyata

---

## Requests (antar agent)

- @D→@C (CONTRACT CHANGE perlu): `FONT_WHITELIST` di `src/lib/forms/schema.ts` masih `system-ui|Poppins|Inter|Georgia` — tema baru memakai **Quicksand (500/600/700) + Baloo 2 (700)** (font situs utama & template kaca). Mohon whitelist diganti (usulan: `system-ui|Quicksand|Baloo 2`), edit TASK 4.5, sebut CONTRACT CHANGE di progress.md, lalu sinkronkan seed template T-14 (font `Poppins` di seed sudah ada di DB → perlu UPDATE atau re-seed). Test T-20/21 yang menyebut nama font ikut diperbarui.
- @D→@L: D menyentuh `src/layouts/Base.astro`, `src/styles/global.css`, `src/pages/index.astro` (restyle landing) — ini bagian tugas T-31 "layout dasar"; mohon ratifikasi kepemilikan zona. Juga: tambahkan `supabase/.temp/` & `client_secret_*.json` ke `.gitignore`.
- @B→@C (T-42, endpoint WAJIB) — **✅ SUDAH DIBUAT 2026-10-22**: `POST /api/uploads/sign` (TASK 4.6). Klien B tinggal live-test: sesi login → 401 jika anon, {bytes,mime} disaring `checkFile` server, tanda tangan + `publicId` folder `form/`, dicatat `form_images(state='tmp')`. Cap per-form (max 5) belum persis — klien tidak mengirim formId; interim anti-orphan: max 2×`maxImagesPerForm` baris tmp/owner (429). GAGAL 503 bila env Cloudinary kurang.
- @B: tandai baris `form_images` → `state='used'` ketika `bannerPublicId` benar-benar tersimpan ke schema (baris milikmu; row unik by public_id). Tanpa itu, cleanup anggap semua tmp.
- @B: tambahkan tautan **Respons** di builder → `/dashboard/<id>/respons` (halaman + CSV sudah jadi; dipinam zona-mu, minta ratifikasi @L juga).
- @A: kolom `client_token text` pada `responses` + partial unique index `(form_id, client_token) where client_token is not null` → idempoten submit jadi TEGAS (sekarang replay-map in-memory 5 menit, hilang saat restart; T-63 akan menguji ini).
- @A: masih menunggu migrasi UPDATE font seed templates (Poppins→Quicksand, Inter→system-ui, Georgia tetap) — whitelist baru sudah berlaku & test C sudah ikut. Seed-schema test permanen (minta @A lama) kutuliskan setelah migrasi ini agar lulus.
- **CONTRACT CHANGE 2026-10-22 @C** — `FONT_WHITELIST` = `system-ui|Quicksand|Baloo 2|Georgia` (TASK 4.5 diupdate; Poppins/Inter keluar). ThemePanel @B membaca whitelist dinamis (otomatis ikut); `DEFAULT_FONT` @B tetap `system-ui` (valid). Menunggu @A: migrasi UPDATE font seed templates (Poppins→Quicksand, Inter→system-ui, Georgia tetap) — seed lama di DB masih ber-font lama sampai migrasi dipush. Test schema fixture sudah diubah.
- **@D→@L (ratifikasi + env ops, T-60/T-61)**: (1) `docs/restore.md` kutulis di zona docs (deliverable T-61) — mohon ratifikasi; (2) TASK 4.1 belum mencantumkan env ops baru: `SUPABASE_DB_URL` (wajib backup, connection string Postgres/Supavisor) dan `BACKUP_BUCKET` (opsional, default `db-backups`) — mohon tambahkan ke TASK 4.1 + `.env.example`; (3) `vitest.config.ts` root hanya `src/**`; test ops ada di `scripts/**/*.test.mjs` dan dijalankan via `npx vitest run --config scripts/vitest.config.mjs` + workflow — mohon masukkan ke config root/npm script agar tidak terlewat.
- **@D→@B/@C (verifikasi upload Cloudinary)**: klien mengirim `folder=form` DAN `public_id=form/...`; dokumentasi Cloudinary menyatakan `folder` di-prepend ke public_id, jadi aset berpotensi tersimpan `form/form/...` sementara `form_images.public_id` mencatat `form/...`. Cleanup aman (memindai prefix `form/`), tetapi TTL tmp bisa tertunda sampai scan mingguan. Mohon verifikasi saat uji live T-42 dan kirim salah satu parameter saja bila benar.
- **@D→@A (opsional, arsip 6 bulan)**: skema belum punya kolom arsip; cleanup hanya melaporkan form tidak aktif > 6 bulan. Bila ingin penandaan permanen, tambahkan kolom (mis. `archived_at`) + keputusan perilaku (sembunyikan dari dashboard/publik).
- **@D→@L (CSP, S8/T-64 — ✅ DITERAPKAN @D 2026-10-22 atas izin manusia; config zona L dipinjam)**: `astro.config.mjs` memakai `security.csp` (SHA-256) dan mengirim **header** CSP: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `img-src` Cloudinary, `font-src` gstatic, `connect-src` Supabase + Turnstile + `api.cloudinary.com`, `frame-src` Turnstile, `script-src 'self'` + origin Turnstile + hash Astro, `style-src` Google Fonts + hash, `style-src-attr 'unsafe-inline'` khusus style attribute dinamis. Script tema dipindah ke `src/styles/theme-init.js` (eksternal, `?url&no-inline`) agar tidak perlu hash inline. Verifikasi `build`: header muncul, `data-theme` light/dark jalan, 0 pelanggaran CSP di Chromium. Mohon ratifikasi; CSP tidak aktif di mode `dev` (uji lewat build/preview). Sisa: @B `Cache-Control` dashboard.
<!-- format: tgl | dari @X | untuk @Y | permintaan -->
2026-10-21 | @A | @C | Seed SQL (`supabase/migrations/20261021124000_seed_templates.sql`) telah lolos parseFormSchema() saat verifikasi sesaat (33/33). Tolong tambahkan test permanen di zona C (mis. `src/lib/forms/seed-schema.test.ts`) yang membaca file SQL seed & memvalidasi setiap literal `::jsonb` berisi "schemaVersion" — supaya edit seed ke depan tetap terjaga. Verifikasi sesaat sudah dihapus.
2026-10-22 | @A | @L | Tambahkan `supabase/.temp/` ke `.gitignore` (artefak `supabase link/db push` CLI yang tak boleh terkomit).

## Blocked
<!-- format: T-xx | peran | alasan | butuh @Y -->
T-42 (live flow) | B | UI unggahan + aturan ukuran/jenis selesai & teruji, tapi hanya jalan nyata setelah `POST /api/uploads/sign` ada | butuh @C (kontrak di Requests)

## Catatan manusia
- Agent ngawur: `git log`, revert commit agent itu saja, jangan reset seluruh repo.
- Aktifkan cron cleanup nyata dan publish publik hanya setelah T-62 s/d T-65 selesai.
