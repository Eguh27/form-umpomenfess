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
- [x] T-15 @A 2026-10-22-18:05 Login & Sign Up page (email & password, desain kartu glassmorphic referensi gambar, toggle show/hide password, tab Masuk & Daftar, Google OAuth) + endpoint POST /auth/email — 176 test lulus, lint 0, check 0, build sukses

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
- [x] T-45 @B 2026-10-22-17:40 Dashboard Canva-style (hero search, stats, template gallery, filter tab, salin link) + Tap-to-add Builder (palet elemen & pertanyaan siap pakai) + Multi-page support (splitIntoPages, page break divider, simulasi langkah responden) + 5 template bawaan riset & 8 preset tema — 171 test lulus, check 0, lint 0, build hijau
- [x] T-70 @B 2026-10-24-16:27 Hero LANDING menampilkan ilustrasi SVG dari folder design (tanpa pembungkus, max 500px, animasi halus + guard prefers-reduced-motion; dark mode approved visual user) — kode hero terserap commit T-67 @D (b506f91) lewat sweep working-tree; aset public/ + sisa copy tercommit @B; ratifikasi @L/D di Requests
- [x] T-71 @B 2026-10-24-16:40 Pembersihan slop redesign dashboard (48 temuan · remove-ai-slop): komentar restate & dead code dihapus (QuickSuggestion, UserSummary.id, data-testid, kind date/time, 📊 ganda, docblock proklamasi); micro-fix perilaku-netral: showToast timer-leak, meta theme-color non-media kembali (query :not([media]) tak lagi null), dashboard.css via halaman, featured template by-id, union tag diperketat, default judul satu lapis, test emoji→label — 206 test, lint/check 0, build hijau (a13b1f4)
- [x] T-72 @B 2026-10-24-17:43 Redesign dashboard "tenang" (kritik user: terlalu ribet): 0 emoji pictorial, kartu tanpa border dekoratif (shadow+spasi), hapus panel/kontrol duplikat (FeaturedCard, filter ganda, tabel ganda, kartu-dalam-kartu), navigasi tunggal sidebar (desktop) + tab ringkas (mobile), referensi `design/reference/e-tutor-dashboard(...).html`; fitur inti & kontrak test tetap — selesai e0ade01; sapaan hangat + Buka/Salin link; 208 test, lint/check 0
- [~] T-73 @B 2026-10-24-21:29 Builder "tenang": shell mandiri tanpa Base (tanpa header/footer landing), topbar tipis, 3 kolom (struktur | kanvas+preview | properti) + mode mobile, `builder.css` scoped, 0 emoji/border dekoratif/inline style, preview HP 390 & desktop 640 dengan parity tema (cardStyle, aksen, banner legacy, ukuran heading), fix autosave race + undo dirty + error mentah + semantik tab; stepper publik menyusul T-75
- [~] T-74 @B 2026-10-24-21:35 Banner base64 (permintaan user; melintasi zona A/C): kolom `forms.banner_data_url` + CHECK (≤350k char, WebP/JPEG/PNG, decode ≤256KB), upload klien kompres 1200×630 WebP q0.8 (input ≤2MB), simpan hanya saat berubah, preview builder + halaman publik (fallback `bannerPublicId`), tanpa og:image; migrasi `20261024213000` + view publik; query list/respons/CSV tidak mengambil kolom

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
- [~] T-65 @L Uji end-to-end dummy lalu uji di HP dengan beberapa teman — ✅ SKRIP SIAP `docs/uji-manual.md` (10 seksi + Bukti akhir): eksekusi tinggal manusia/kawan; saat semua ✓ → ubah ke [x]
- [x] T-66 @L 2026-10-22-19:05 Checklist go-live -> `docs/golive-checklist.md` (8 seksi: env produksi 11 kutip sumber, urutan 6 migrasi berikut verifikasi SQL, OAuth/domain, cron ops dgn dry-run→nyata, Turnstile produksi, smoke 9 langkah, kebersihan repo, rollback) + pendukung: env ops masuk TASK 4.1/.env.example, `test:ops` di package.json, gitignore `.temp`/`client_secret`, ratifikasi seluruh Requests

## Stories EPIC-A (dari `docs/epic-plan-roadmap.md`)
- [x] E-A1 @C/@B 2026-10-22 19:30 formId pada `POST /api/uploads/sign` → cap gambar eksak 5/form; helper imageSignGuard.ts, endpoint sign, wiring BannerUpload, ThemePanel, Editor + pesan 429 ramah (177 test lulus)
- [x] E-A2 @C 2026-10-22 19:32 Pluggable Rate-Limit Store: interface RateLimitStore, MemoryRateLimitStore bounded FIFO default, support async/sync custom adapter, await di submit/report, 6 test lulus
- [x] E-A4 @L/@D 2026-10-22 19:33 Security headers di middleware (X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options: DENY, HSTS max-age 1 tahun) — terverifikasi curl
- [x] T-67 @D 2026-10-24 17:00 Redesign seluruh UI mengikuti palet **Kaca · Blush** (bukan langit/gunung situs utama): token light/dark, header/footer, tombol, kartu, landing, login, public form, builder defaults; navbar & tombol diambil dari pola referensi (bar kaca mengambang, logo tile coral miring, CTA hijau, tombol 54px radius 18, secondary outline hijau) dengan coral diturunkan ke #B8422E agar lolos WCAG; font Baloo 2 + Quicksand + Space Mono; 162 test app + 34 ops + lint/check/build hijau; verifikasi browser light/dark di 360/390/1440 & menu mobile + toggle tema
- [x] T-68 @R 2026-10-22 14:10 Uji E2E dummy otomatis (headless) terhadap app + DB nyata — bagian agent dari T-65: login → builder → publish → form publik → submit (Turnstile test key) → respons → CSV → moderasi §9; hasil di `docs/review-e2e-T68.md` — **3 temuan**: E1 blocker "Buat form/Duplikat" gagal (`owner_id` NULL), E2 blocker migrasi seed font belum dieksekusi, E3 KRITIS `PUBLIC_SUPABASE_ANON_KEY` = `SUPABASE_SERVICE_ROLE_KEY` (key bocor ke bundle client); 12 tes endpoint + 20 cek UI LULUS, 145 test app hijau, data dummy dibersihkan
- [x] T-69 @B 2026-10-22 14:45 Remediasi blocker T-68: **E1** `insertForm` menyertakan `owner_id` dari SESI (`auth.getUser()`) — "Buat form"/"Duplikat" tak bisa dipakai sebelumnya; galat Postgres mentah diganti pesan ramah (`friendlyError`); 5 test baru — verifikasi browser+DB nyata: Form kosong ✅, template ✅, Duplikat ✅ (1→3 form). **E2** seed font: @L patch kolom `theme` via REST 14:46, @R melengkapi `schema.theme` (sumber kebenaran) 14:55 → 0 font liar → "Buat dari template" preview merender + Publish ✅. 161 test + check 0 + build hijau; data dummy dibersihkan

## Stories EPIC-B (Panel Admin Moderasi Laporan, docs/impl-plan-epic-b.md)
- [x] E-B1 @A 2026-10-22 19:50 Migrasi reports (`status`, `resolved_at`, `resolved_by`, `action_taken`, `notes`) + SQL test
- [x] E-B2 @A/@C 2026-10-22 19:50 Otorisasi `isAdmin(user)` + modul data moderasi laporan `src/lib/forms/reports.ts` + unit tests
- [x] E-B3 @C 2026-10-22 19:50 Endpoint aksi moderasi `POST /api/admin/reports/[id]/action` (resolve, dismiss, close_form) + test
- [x] E-B4 @B/@D 2026-10-22 19:50 Halaman `/dashboard/admin/laporan` (filter status, review detail form, tindakan cepat) + navigasi dashboard


---

## Requests (antar agent)

- **@R→manusia/@L (KRITIS, E3 dari T-68)** — `PUBLIC_SUPABASE_ANON_KEY` **identik** dengan `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` (sha sama, 219 char) → key service role bocor ke aset client (`dist/client/_astro/jsx-runtime.*.js`, `.vercel/output/...`) dan bisa dipakai siapa pun untuk melewati seluruh RLS (baca `responses` = jawaban responden, tulis/hapus `forms`/`reports`). **Minta aksi manusia:** (1) Supabase → API Keys → pakai key **anon/publishable yang asli** untuk `PUBLIC_SUPABASE_ANON_KEY` (`.env.local` + Vercel Production & Preview); (2) **rotasi `SUPABASE_SERVICE_ROLE_KEY`** (sudah bocor di artefak build) → update `.env.local` + Vercel + GitHub Secrets; (3) build ulang & deploy ulang; (4) guard anti-regresi: test gagal bila kedua key sama + cek "grep bundle client" di `docs/golive-checklist.md` §1. Detail + bukti: `docs/review-e2e-T68.md` §E3.
- **@R→manusia (E2 dari T-68) — ✅ SEBAGIAN TERTUTUP 14:46–14:55** — migrasi `20261022190000_seed_font_update.sql` dieksekusi @L via REST, tetapi **hanya kolom `templates.theme`**; sumber kebenaran `templates.schema.theme` masih Poppins/Inter → template tetap ditolak validator. @R melengkapi via REST (idempoten, 4 baris) → 0 font liar → "Buat dari template" preview merender + Publish berhasil. **SISA (zona @A):** lengkapi berkas migrasi agar ikut update `schema->'theme'->>'font'` dan assertion memeriksa kedua kolom — kalau tidak, environment lain yang menjalankan migrasi akan meninggalkan template setengah diperbaiki.
- **@R→@L (E6 dari T-68, catatan)** — browser client (`@supabase/ssr`) membaca sesi dari cookie yang **terbaca JS** (`httpOnly:false`); kalau cookie auth di-*httpOnly*-kan, seluruh tulis sisi klien (insert/publish/autosave) gagal diam-diam. Saat E3 diperbaiki, verifikasi juga **tulis dari browser** (buat form + publish), bukan hanya tampilan halaman. Detail: `docs/review-e2e-T68.md` §E6.
- @D→@C (CONTRACT CHANGE perlu): `FONT_WHITELIST` di `src/lib/forms/schema.ts` masih `system-ui|Poppins|Inter|Georgia` — tema baru memakai **Quicksand (500/600/700) + Baloo 2 (700)** (font situs utama & template kaca). Mohon whitelist diganti (usulan: `system-ui|Quicksand|Baloo 2`), edit TASK 4.5, sebut CONTRACT CHANGE di progress.md, lalu sinkronkan seed template T-14 (font `Poppins` di seed sudah ada di DB → perlu UPDATE atau re-seed). Test T-20/21 yang menyebut nama font ikut diperbarui. — ✅ SELESAI & DIRATIFIKASI @L 2026-10-22: C sudah kerjakan (entri CONTRACT CHANGE di bawah); kekosongan seed ditutup migrasi `20261022190000_seed_font_update.sql` (@A).
- @D→@L: D menyentuh `src/layouts/Base.astro`, `src/styles/global.css`, `src/pages/index.astro` (restyle landing) — ini bagian tugas T-31 "layout dasar"; mohon ratifikasi kepemilikan zona. Juga: tambahkan `supabase/.temp/` & `client_secret_*.json` ke `.gitignore`. — ✅ DIRATIFIKASI @L 2026-10-22: kepemilikan layout sah (deliverable lulus gates); gitignore ditambah @L.
- @B→@C (T-42, endpoint WAJIB) — **✅ SUDAH DIBUAT 2026-10-22**: `POST /api/uploads/sign` (TASK 4.6). Klien B tinggal live-test: sesi login → 401 jika anon, {bytes,mime} disaring `checkFile` server, tanda tangan + `publicId` folder `form/`, dicatat `form_images(state='tmp')`. Cap per-form (max 5) belum persis — klien tidak mengirim formId; interim anti-orphan: max 2×`maxImagesPerForm` baris tmp/owner (429). GAGAL 503 bila env Cloudinary kurang.
- @B: tandai baris `form_images` → `state='used'` ketika `bannerPublicId` benar-benar tersimpan ke schema (baris milikmu; row unik by public_id). Tanpa itu, cleanup anggap semua tmp. — ✅ SELESAI @B 2026-10-22 (`imagesUsed.ts` di wiring Editor.save, `0cbde22`).
- @B: tambahkan tautan **Respons** di builder → `/dashboard/<id>/respons` (halaman + CSV sudah jadi; dipinam zona-mu, minta ratifikasi @L juga). — ✅ SELESAI @B 2026-10-22 (breadcrumb builder `[id].astro`); halaman respons kini penulisan B sendiri (pin C tak berlaku lagi).
- @A: kolom `client_token text` pada `responses` + partial unique index `(form_id, client_token) where client_token is not null` → idempoten submit jadi TEGAS (sekarang replay-map in-memory 5 menit, hilang saat restart; T-63 akan menguji ini). — ✅ SELESAI @A: migrasi `20261022174000` dieksekusi manusia + uji SQL 8/8 lulus; endpoint sudah memakai rpc.
- @A: masih menunggu migrasi UPDATE font seed templates (Poppins→Quicksand, Inter→system-ui, Georgia tetap) — whitelist baru sudah berlaku & test C sudah ikut. Seed-schema test permanen (minta @A lama) kutuliskan setelah migrasi ini agar lulus. — ✅ SELESAI @A: `20261022190000_seed_font_update.sql` (idempoten + assertion diri) + `tests/seed_font_check.sql`. ⚠ WAJIB dieksekusi manusia di produksi (§2 checklist golive) — sampai itu copy template seed gagal autosave.
- **CONTRACT CHANGE 2026-10-22 @C** — `FONT_WHITELIST` = `system-ui|Quicksand|Baloo 2|Georgia` (TASK 4.5 diupdate; Poppins/Inter keluar). ThemePanel @B membaca whitelist dinamis (otomatis ikut); `DEFAULT_FONT` @B tetap `system-ui` (valid). Menunggu @A: migrasi UPDATE font seed templates (Poppins→Quicksand, Inter→system-ui, Georgia tetap) — seed lama di DB masih ber-font lama sampai migrasi dipush. Test schema fixture sudah diubah. — ✅ diratifikasi @L + kekosongan seed ditutup migrasi `20261022190000`.
- **@D→@L (ratifikasi + env ops, T-60/T-61)**: (1) `docs/restore.md` kutulis di zona docs (deliverable T-61) — mohon ratifikasi; (2) TASK 4.1 belum mencantumkan env ops baru: `SUPABASE_DB_URL` (wajib backup, connection string Postgres/Supavisor) dan `BACKUP_BUCKET` (opsional, default `db-backups`) — mohon tambahkan ke TASK 4.1 + `.env.example`; (3) `vitest.config.ts` root hanya `src/**`; test ops ada di `scripts/**/*.test.mjs` dan dijalankan via `npx vitest run --config scripts/vitest.config.mjs` + workflow — mohon masukkan ke config root/npm script agar tidak terlewat. — ✅ DIRATIFIKASI & SELESAI @L 2026-10-22: restore.md sah; env ops masuk TASK 4.1 + `.env.example`; script `test:ops` ditambah di package.json (config scripts/vitest.config.mjs tetap — keduanya sinergis).
- **@D→@B/@C (verifikasi upload Cloudinary)**: klien mengirim `folder=form` DAN `public_id=form/...`; dokumentasi Cloudinary menyatakan `folder` di-prepend ke public_id, jadi aset berpotensi tersimpan `form/form/...` sementara `form_images.public_id` mencatat `form/...`. Cleanup aman (memindai prefix `form/`), tetapi TTL tmp bisa tertunda sampai scan mingguan. Mohon verifikasi saat uji live T-42 dan kirim salah satu parameter saja bila benar. — ✅ DIJAWAB @L (Context7 docs Cloudinary): bila `public_id` sudah memuat path, param `folder` DIABAIKAN (mode legacy) / hanya alias display-folder (mode baru) — tidak ada penggabungan `form/form/…`, public_id tetap `form/x`. Tanpa perubahan kode; tetap ada satu langkah konfirmasi visual di `uji-manual.md` §4 & golive §6.3.
- **@D→@A (opsional, arsip 6 bulan)**: skema belum punya kolom arsip; cleanup hanya melaporkan form tidak aktif > 6 bulan. Bila ingin penandaan permanen, tambahkan kolom (mis. `archived_at`) + keputusan perilaku (sembunyikan dari dashboard/publik).
- **@D→@L (CSP, S8/T-64 — ✅ DITERAPKAN @D 2026-10-22 atas izin manusia; config zona L dipinjam)**: `astro.config.mjs` memakai `security.csp` (SHA-256) dan mengirim **header** CSP: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `img-src` Cloudinary, `font-src` gstatic, `connect-src` Supabase + Turnstile + `api.cloudinary.com`, `frame-src` Turnstile, `script-src 'self'` + origin Turnstile + hash Astro, `style-src` Google Fonts + hash, `style-src-attr 'unsafe-inline'` khusus style attribute dinamis. Script tema dipindah ke `src/styles/theme-init.js` (eksternal, `?url&no-inline`) agar tidak perlu hash inline. Verifikasi `build`: header muncul, `data-theme` light/dark jalan, 0 pelanggaran CSP di Chromium. Mohon ratifikasi; CSP tidak aktif di mode `dev` (uji lewat build/preview). Sisa: @B `Cache-Control` dashboard. — ✅ DIRATIFIKASI @L 2026-10-22 (deliverable terverifikasi D + langkah cek masuk golive §6.9); sisa @B sudah selesai (`0cbde22`).
<!-- format: tgl | dari @X | untuk @Y | permintaan -->
2026-10-21 | @A | @C | Seed SQL (`supabase/migrations/20261021124000_seed_templates.sql`) telah lolos parseFormSchema() saat verifikasi sesaat (33/33). Tolong tambahkan test permanen di zona C (mis. `src/lib/forms/seed-schema.test.ts`) yang membaca file SQL seed & memvalidasi setiap literal `::jsonb` berisi "schemaVersion" — supaya edit seed ke depan tetap terjaga. Verifikasi sesaat sudah dihapus.
2026-10-22 | @A | @L | Tambahkan `supabase/.temp/` ke `.gitignore` (artefak `supabase link/db push` CLI yang tak boleh terkomit).
2026-10-22 | @B | @C | Multi-halaman form selesai di builder (T-45). Halaman publik /f/[slug] (zona C) dapat ditambahkan stepper bertahap jika terdapat divider ber-id 'page_*' (Halaman 1 -> Lanjut -> Halaman 2 -> Kirim).
2026-10-24 | @B | @L/@D | Ratifikasi T-70: (1) `src/pages/index.astro` disunting atas izin manusia sesi ini — ilustrasi SVG design/ di hero, tanpa pembungkus, animasi halus + guard prefers-reduced-motion, hero-note sisanya "Gratis"; kode hero ikut terserap commit T-67 @D (b506f91) saat in-flight, mohon diketahui @D. (2) Tweak copy landing (badge "Form Builder", kalimat hero-sub dipangkas) dilakukan pihak lain pasca-commit T-67 — dilepas apa adanya di commit @B tanpa direvert, mohon pemiliknya mengakui. (3) Folder `public/` baru (aset statis) berisi `public/illustrasi-riset.svg` — salinan `design/Mahasiswa dan dosen melakukan riset.svg` (file sumber zona manusia, tidak disentuh).

## Blocked
<!-- format: T-xx | peran | alasan | butuh @Y -->
T-42 (live flow) | B | UI unggahan + aturan ukuran/jenis selesai & teruji, tapi hanya jalan nyata setelah `POST /api/uploads/sign` ada | butuh @C (kontrak di Requests)

## Catatan manusia
- Agent ngawur: `git log`, revert commit agent itu saja, jangan reset seluruh repo.
- Aktifkan cron cleanup nyata dan publish publik hanya setelah T-62 s/d T-65 selesai.
