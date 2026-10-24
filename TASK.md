# TASK.md — Spesifikasi & Kontrak Form Builder (MVP)

Sumber kebenaran untuk semua agent. Ubah hanya lewat `CONTRACT CHANGE` (lihat AGENTS.md).

## 1. Tujuan
Platform form (seperti Google Form) di `form.umpomenfess.my.id`, dengan tampilan yang bisa dikustom secara visual dan terasa satu keluarga dengan situs menfess utama. Target: mahasiswa yang mencari responden skripsi.

Pembuat form wajib login. Responden tidak perlu login.

## 2. Di luar scope MVP
Langganan/pembayaran, elemen premium, logika kondisional, multi-halaman/section, upload file oleh responden, raw HTML/CSS/JS dari user, drag & drop (menyusul; MVP cukup klik + panel properti + tombol naik/turun).
Tetap sediakan kolom `tier` (default `free`) agar paywall mudah ditambah kelak.

## 3. Stack
- Astro (SSR, adapter Vercel), TypeScript, project Vercel terpisah dari menfess
- Supabase (project BARU): Auth (Google OAuth) + Postgres + RLS
- Cloudinary (akun BARU): hanya banner/gambar dari pembuat form
- Cloudflare Turnstile (anti-spam), GitHub Actions (cron cleanup & backup)
- Builder = island interaktif (React/Preact/Svelte; pilih satu di Fase 0, catat di audit)

## 4. Kontrak

### 4.1 Env vars
`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only),
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server only),
`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (server only), `PUBLIC_SITE_URL`,
`SUPABASE_DB_URL` (server/workflow only — pg_dump backup, T-61),
`BACKUP_BUCKET` (opsional, default `db-backups` — bucket Storage harus privat)

### 4.2 Limit (konstanta di `src/lib/config/limits.ts`, mudah diubah)
Usulan awal: maks form aktif per user 20; maks gambar per form 5; maks ukuran gambar 2 MB; banner: input 2 MB, hasil kompres target ≤180 KB (hard cap 256 KB), data URL ≤350.000 karakter; maks pertanyaan per form 50; maks panjang jawaban teks 2000 karakter; maks respons per form 2000 (free); rate limit submit per IP; maks ukuran payload submit.

### 4.3 Tabel (cek schema nyata; Agent A finalkan nama di Fase 0/1)
- `forms`: id, owner_id, slug (UNIQUE, huruf kecil/angka/-), title, status (`draft|published|closed`), schema jsonb, theme jsonb, schema_version int, version int, tier text default 'free', closes_at, max_responses, `banner_data_url text null` (data URL banner terkompresi; CHECK prefix WebP/JPEG/PNG + panjang), deleted_at, created_at, updated_at
- `form_images`: id, form_id (nullable; sejak E-A1 dapat terisi sejak lahir bila pembuat mengirim formId saat sign), owner_id, public_id, bytes, state (`tmp|used`), created_at
- `responses`: id, form_id, form_version, answers jsonb, client_token text null (idempoten; partial unique `(form_id, client_token) where client_token is not null`; tidak pernah tampil ke publik), created_at. INSERT lewat rpc `insert_response_guarded` (kuota atomik + fast-path duplikat) dengan fallback count→insert bila rpc belum dipush.
- `reports`: id, form_id, reason, created_at
- `templates`: id, name, preview_url, schema jsonb, theme jsonb, tier default 'free'
- Slug yang dicadangkan (admin, api, dashboard, f, login, dll.) ditolak.

### 4.4 RLS
- Pembuat: CRUD penuh hanya untuk `forms`/`form_images` miliknya; SELECT `responses` hanya untuk form miliknya.
- Publik: hanya bisa membaca form `published` (tidak `deleted_at`) lewat view/RPC yang mengembalikan kolom aman.
- INSERT `responses` hanya lewat endpoint server (service role) setelah validasi; tidak ada INSERT langsung dari browser.

### 4.5 Schema form (JSON, versi 1) — divalidasi dengan zod di server
```json
{
  "schemaVersion": 1,
  "theme": {
    "bg": "#fdf2f8", "accent": "#ec4899", "text": "#1f2937",
    "font": "Quicksand", "radius": 16, "cardStyle": "menfess",
    "bannerPublicId": null
  },
  "blocks": [
    {"id":"b1","type":"heading","text":"Survei Skripsi","size":"xl","align":"center"},
    {"id":"b2","type":"text","text":"Mohon bantuannya ya!"},
    {"id":"b3","type":"image","publicId":"form/abc","align":"center"},
    {"id":"b4","type":"divider"},
    {"id":"q1","type":"question","kind":"short_text","label":"Nama panggilan","required":true},
    {"id":"q2","type":"question","kind":"single_choice","label":"Usia","options":["<20","20-25",">25"]},
    {"id":"q3","type":"question","kind":"scale","label":"Seberapa setuju?","min":1,"max":5}
  ]
}
```
- Block type: `heading|text|image|divider|question`
- Question kind: `short_text|paragraph|single_choice|multiple_choice|dropdown|scale`
- `font` HANYA dari whitelist **`system-ui|Quicksand|Baloo 2|Georgia`** (CONTRACT CHANGE 2026-10-22 @C: Poppins/Inter diganti Quicksand/Baloo 2 — mengikuti topic situs utama & template kaca; Georgia disematkan untuk variety serif); `cardStyle` hanya dari preset (`menfess|plain|soft`); warna harus hex valid; angka dibatasi rentang. Nilai di luar whitelist DITOLAK, bukan dibersihkan diam-diam.
- Satu sumber tipe & validator: `src/lib/forms/schema.ts` (dimiliki Agent C; builder dan public page mengimpor dari sini).
- Banner BARU berada di kolom `forms.banner_data_url` (data URL terkompresi), BUKAN di `schema.theme`. `theme.bannerPublicId` dipertahankan hanya sebagai fallback baca untuk form lama (Cloudinary).
- `answers`: `{ "<questionId>": string | string[] | number }`, divalidasi terhadap schema versi form saat itu.

### 4.6 Endpoint (Agent C kecuali disebut)
- `POST /api/forms/[slug]/submit`: cek form published & belum tutup & belum penuh; verifikasi Turnstile; rate limit; validasi jawaban; simpan; idempoten terhadap double-click.
- `GET /api/forms/[id]/export.csv`: hanya pemilik; kolom sesuai urutan pertanyaan; lindungi dari CSV injection (awali `=`, `+`, `-`, `@` dengan `'`).
- `POST /api/uploads/sign` (Agent B/D bersama C): tanda tangan upload Cloudinary; hanya user login; batasi ukuran/format/folder `form/`; catat di `form_images` (state `tmp`).

### 4.7 Banner base64 (CONTRACT CHANGE 2026-10-24 @B)
- Kolom `forms.banner_data_url text null`; CHECK: `null` atau prefix `data:image/(webp|jpeg|png);base64,`, panjang ≤350.000 karakter, hasil decode ≤262.144 byte.
- Klien: terima JPEG/PNG/WebP ≤2 MB; TOLAK GIF/SVG; crop tengah 1200×630; WebP q≈0.8 (fallback JPEG bila perlu); target ≤180 KB, hard cap 256 KB.
- Simpan hanya saat banner berubah (jangan ikut setiap autosave); JANGAN menyalin base64 ke `schema` atau `forms.theme`.
- Render prioritas: `banner_data_url` → `theme.bannerPublicId` (legacy Cloudinary) → tanpa banner. Data URL DILARANG dipakai untuk `og:image`/`twitter:image`.
- `public_forms` mengekspos `banner_data_url` (kolom ditambahkan di akhir). Query dashboard list, respons, submit, dan CSV TIDAK mengambil kolom ini.
- CSP `img-src` sudah mengizinkan `data:`; dilarang memakai `blob:` tanpa mengubah konfigurasi CSP.
- Migrasi: `supabase/migrations/20261024213000_banner_data_url.sql`; uji constraint: `tests/banner_data_url.sql`.

## 5. Tampilan selaras dengan situs menfess
- Satu sumber: `design/tokens.css` (CSS variables: warna, font, radius, spasi, bayangan) + `design/README.md` (komponen: header, footer, tombol, kartu).
- Diambil dari repo menfess (manusia menyalin file yang diperlukan ke folder `design/reference/` di repo ini; agent tidak mengakses repo lain).
- Halaman form dan dashboard memakai tokens ini; tema pembuat form hanya menimpa variabel yang diizinkan.
- Preset kartu `menfess` meniru gaya postingan menfess.
- Header/footer/logo selaras dengan situs utama; ada tautan kembali ke `umpomenfess.my.id`.

## 6. Fitur MVP
1. Login Google (Supabase Auth); halaman terlindungi untuk dashboard.
2. Dashboard: daftar form (status, jumlah respons), buat dari template, buat kosong, duplikat, tutup, hapus (soft delete).
3. Builder visual: tambah/hapus/urut blok; klik elemen -> panel properti (color picker, dropdown font, slider radius); upload banner; preview live (toggle HP/desktop); simpan draft otomatis; undo/redo; tombol publish.
4. Halaman isi form `/f/<slug>`: ringan, mobile-first, validasi sisi klien + server, halaman terima kasih, catatan privasi, tombol "Laporkan form".
5. Respons: tabel, ringkasan sederhana, export CSV.
6. Template awal (5-10): survei skripsi, skala Likert, undangan responden, dll. (data di tabel `templates`).
7. Anti-spam: Turnstile + rate limit + batas respons + tanggal tutup.
8. Cleanup & backup (lihat 8).

## 7. Aturan keamanan khusus
- Tidak ada HTML mentah; semua teks user di-escape saat render; CSP ketat; tidak ada atribut event/inline script dari user.
- URL gambar hanya `publicId` Cloudinary milik project ini, bukan URL bebas (cegah tracking pixel).
- Validasi kontras minimal antara teks dan latar tema; tolak kombinasi tak terbaca.
- Larangan minta kata sandi/data sensitif: tampilkan peringatan di builder; tombol Laporkan membuat baris `reports`.
- Hanya pemilik yang bisa melihat respons; verifikasi kepemilikan di server, bukan hanya di UI.
- Log tidak boleh memuat isi jawaban responden maupun secret.

## 8. Cleanup & backup (Agent D, GitHub Actions)
- Harian: hapus gambar `tmp` > 24 jam (Cloudinary + baris DB); tutup form yang lewat `closes_at`.
- Mingguan: cari gambar orphan (ada di Cloudinary, tidak ada di DB) dan hapus; hard delete form `deleted_at` > 30 hari beserta gambarnya (hapus via tag/public_id).
- Form tidak aktif 6 bulan: tandai untuk arsip (notifikasi bisa menyusul).
- Backup mingguan dump database ke penyimpanan di luar repo (jangan commit dump ke git); dokumentasikan cara restore.
- Cron memakai secret via GitHub Secrets; log tanpa data responden.

## 9. Acceptance criteria per workstream
**WS-A**: skema + RLS tervalidasi test (user A tidak bisa baca/ubah form/respons user B; publik tidak bisa baca respons; hanya form published terbaca publik); login Google jalan; seed template.
**WS-B**: alur buat -> edit -> preview -> publish jalan di HP dan desktop; builder hanya menghasilkan JSON valid sesuai 4.5; tidak ada input HTML mentah; upload gambar sesuai batas.
**WS-C**: validator schema + test (nilai di luar whitelist ditolak); submit endpoint aman dan idempoten; CSV benar dan aman dari injection; halaman publik cepat dan mobile-first.
**WS-D**: tokens/design terambil dari referensi menfess dan dipakai konsisten; cron cleanup/backup jalan di mode dry-run dulu lalu nyata; panduan restore ada.
**WS-R**: `docs/review-security.md` memeriksa: bypass RLS, XSS lewat JSON, CSV injection, bocor secret, abuse upload, rate limit/Turnstile, race condition batas respons, IDOR pada endpoint export/upload.

## 10. Pengujian
- Data dummy: beberapa user, form, respons; kasus nakal (payload terlalu besar, ID pertanyaan palsu, nilai tema di luar whitelist, slug dicadangkan, double submit).
- Mock Turnstile dan Cloudinary di test. Jangan memakai akun production.
- Uji manual terakhir di HP nyata dengan beberapa teman.
