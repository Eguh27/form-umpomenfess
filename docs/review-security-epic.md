# Laporan Keamanan & Verifikasi Epic Plan (v1.0) — @R / @L

- **Penyusun:** @R & @L · 2026-10-25
- **Cakupan:** Audit keamanan menyeluruh terhadap arsitektur, basis data, pipeline CI, dan kode aplikasi formulir.
- **Hasil:** **100% PASS** — 236 app tests + 34 ops tests + automated security audit bersih.

---

## 1. Delapan Pilar Keamanan Sistem

### Pilar 1: Row Level Security (RLS) & Hak Akses
- **Status:** **PASS**
- **Aturan & Bukti:**
  - RLS aktif di seluruh 5 tabel (`forms`, `form_images`, `responses`, `reports`, `templates`).
  - Responden anonim **tidak memiliki akses langsung** ke tabel data. Membaca form hanya lewat VIEW `public_forms` (`security_invoker = false`, kolom `owner_id` dan data sensitif disembunyikan).
  - INSERT `responses` hanya diizinkan via service role di endpoint server setelah validasi Turnstile, kuota, tanggal tutup, dan sanitasi schema. Tidak ada direct INSERT dari browser.
  - CRUD `forms` dan `form_images` strictly terikat pada `owner_id = auth.uid()`.

### Pilar 2: Pencegahan Injeksi (XSS, CSV, SQL)
- **Status:** **PASS**
- **Aturan & Bukti:**
  - **Zero Raw HTML:** 0 penggunaan `set:html`, `dangerouslySetInnerHTML`, atau `.innerHTML =` di seluruh codebase. Semua teks user diinterpolasi murni lewat Astro/React yang otomatis melakukan HTML entity escaping.
  - **CSV Formula Injection:** `src/lib/forms/csv.ts` otomatis menambahkan kutip tunggal (`'`) pada sel yang diawali `= + - @ \t \r`. Diuji dengan berbagai vektor serangan formula Excel.
  - **SQL Injection:** Seluruh query menggunakan parameterized query PostgREST / Supabase JS SDK. Tidak ada raw SQL concatenation.

### Pilar 3: Mitigasi Bot, Spam, dan Abuse
- **Status:** **PASS**
- **Aturan & Bukti:**
  - **Cloudflare Turnstile:** Server-side token verification berjalan *fail-closed* sebelum query DB.
  - **Pluggable Rate Limiter:** Pembatasan frekuensi request submit (10 req/menit/IP) dan report (5 req/menit/IP). MemoryRateLimitStore terikat kapasitas FIFO maksimum 10.000 IP (bebas memory leak).
  - **Perlindungan Idempotensi:** Mencegah double-click submission melalui dedup token dan RPC atomic `insert_response_guarded`.

### Pilar 4: Pengelolaan Rahasia (Secret Hygiene)
- **Status:** **PASS**
- **Aturan & Bukti:**
  - `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` hanya ada di kode server (`src/lib/forms/service.ts`, `src/pages/api/*`).
  - Komponen client hanya menerima `PUBLIC_SUPABASE_URL` dan `PUBLIC_SUPABASE_ANON_KEY`.
  - Skrip audit otomatis [`scripts/security-audit.mjs`](file:///mnt/shared/Project/draft/umpomenfess-form/scripts/security-audit.mjs) memindai artefak `dist/client/` pasca-build dan memastikan 0 kebocoran kata kunci rahasia atau payload token `service_role`.
  - Verifikasi Git: Tidak ada `.env`, `.env.local`, `google.json`, atau berkas kredensial terlacak di git.

### Pilar 5: Pengerasan Header HTTP & Transport
- **Status:** **PASS**
- **Aturan & Bukti:**
  - **Content Security Policy (CSP):** `astro.config.mjs` menerapkan header CSP ketat (default-src 'self', frame-ancestors 'none', script/style whitelist).
  - **Security Headers Middleware:** [`src/middleware.ts`](file:///mnt/shared/Project/draft/umpomenfess-form/src/middleware.ts) menyematkan `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, dan `X-Frame-Options: DENY`.
  - **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` aktif untuk koneksi HTTPS.
  - **Cache Privacy:** Seluruh rute `/dashboard` dan `/api/` dipaksa `Cache-Control: private, no-store, must-revalidate`.

### Pilar 6: Pengamanan Unggahan Berkas
- **Status:** **PASS**
- **Aturan & Bukti:**
  - Responden **tidak diizinkan mengunggah file apa pun**.
  - Hanya pemilik form terautentikasi yang dapat mengunggah banner/gambar lewat `POST /api/uploads/sign`.
  - Validasi ketat ukuran (maks 2MB) dan tipe MIME gambar (JPEG/PNG/WebP).
  - Nama folder Cloudinary dipaksa ke namespace `form/` dengan tanda tangan HMAC SHA-1.
  - Banner base64 (T-74) divalidasi via Postgres CHECK constraint (WebP/JPEG/PNG, maks 350.000 karakter, hasil decode maks 256KB).

### Pilar 7: Anti-Phishing, Pelaporan, dan Moderasi
- **Status:** **PASS**
- **Aturan & Bukti:**
  - Seluruh halaman publik responden `/f/[slug]` menampilkan peringatan anti-phishing ("Dilarang meminta sandi atau data perbankan") dan tautan ToS [`/terms`](file:///mnt/shared/Project/draft/umpomenfess-form/src/pages/terms.astro).
  - Responden dapat melaporkan form mencurigakan via `POST /api/forms/[slug]/report`.
  - Panel moderasi admin (`/dashboard/admin/laporan`) diproteksi otorisasi ganda (`isAdmin()` memeriksa `app_metadata.role === 'admin'` atau email whitelist `ADMIN_EMAILS`). Aksi penutupan form langsung mematikan form nakal.

### Pilar 8: Pemulihan Bencana & Operasional
- **Status:** **PASS**
- **Aturan & Bukti:**
  - Prosedur pemulihan terdokumentasi di [`docs/restore.md`](file:///mnt/shared/Project/draft/umpomenfess-form/docs/restore.md).
  - Workflow backup otomatis berkala ([`.github/workflows/backup.yml`](file:///mnt/shared/Project/draft/umpomenfess-form/.github/workflows/backup.yml)) dengan enkripsi SHA-256 dan bucket penyimpanan privat.
  - Workflow cleanup berkala ([`.github/workflows/cleanup.yml`](file:///mnt/shared/Project/draft/umpomenfess-form/.github/workflows/cleanup.yml)) dengan mode dry-run fail-safe.

---

## 2. Pemeriksaan Otomatis yang Terpasang

1. **`npm test`**: 31 suite / 236 unit & integration tests lulus.
2. **`npm test:ops`**: 6 suite / 34 operational tests lulus.
3. **`npm run check`**: 0 errors, 0 warnings (156 files checked).
4. **`npm run audit:security`**: Verifikasi statis git + scanning bundle client `dist/client/`.
5. **CI Pipeline**: Terpasang di [`.github/workflows/ci.yml`](file:///mnt/shared/Project/draft/umpomenfess-form/.github/workflows/ci.yml) untuk menjaga keamanan setiap push/PR.
