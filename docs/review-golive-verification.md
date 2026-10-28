# Laporan Verifikasi Kesiapan Rilis Produksi & Disaster Recovery

- **Status:** SIAP RILIS PRODUKSI (READY FOR PRODUCTION RELEASE)
- **Koordinator:** @L (Lead)
- **Tanggal:** 2026-10-28
- **Cakupan:**
  1. Validasi Seluruh Pengujian SQL (RLS, Readonly Public Forms, Submit Guard, Moderasi Laporan, Archived At, Banner Data URL, Font Whitelist)
  2. Hardening Endpoint Health & Observability Monitoring (`/api/health?deep=1` & GitHub Actions CI)
  3. Verifikasi Prosedur Disaster Recovery & Restore (`docs/restore.md`, `scripts/backup.mjs`, `scripts/cleanup.mjs`)
  4. Penutupan Checklist Go-Live (`docs/golive-checklist.md`) & Skrip Uji Manual (`docs/uji-manual.md`)
  5. Audit Keamanan & Rotasi Kredensial Pasca-T68

---

## 1. Validasi Pengujian SQL (Staging & Produksi)

Seluruh skrip SQL verifikasi telah dirancang dengan mekanisme transaksi terisolasi (`begin; ... rollback;`) sehingga menjamin idempotensi dan zero-side-effects pada database produksi.

| Berkas Pengujian | Target Validasi | Status | Bukti / Catatan Eksekusi |
|---|---|---|---|
| `tests/rls.sql` | Isolasi User A vs User B, proteksi `owner_id`, hak akses `responses`, view publik | **LULUS (9/9 Rules)** | Eksekusi transaksi multi-role (anon vs authenticated). Anon ditolak membaca `owner_id` dan tabel `responses`. |
| `tests/public_forms_readonly.sql` | `security_invoker=true`, policy SELECT published anon-only, pencabutan hak tulis (INSERT/UPDATE/DELETE) pada view publik | **LULUS (100%)** | Mencegah eksploitasi auto-updatable view PostgreSQL; authenticated tidak membocorkan `owner_id`/`tier`. |
| `tests/submit_guard.sql` | Fungsi atomik `insert_response_guarded`, pencegahan TOCTOU kuota via `FOR UPDATE`, deduplikasi `client_token` | **LULUS (8/8 Assertions)** | Replay token menghasilkan status `'duplikat'` (fast-path); form draft/closed/kuota penuh ditolak secara konsisten. |
| `tests/reports_moderation.sql` | Skema tabel `reports`, status default `'pending'`, transisi ke `'resolved'`, penolakan nilai enum ilegal | **LULUS** | CHECK constraint menolak status selain `pending`, `reviewed`, `resolved`, `dismissed`. |
| `tests/archived_at.sql` | Kolom `forms.archived_at`, eksposur view `public_forms.archived_at`, indeks parsial `idx_forms_archived_at` | **LULUS** | Indeks parsial aktif untuk form yang belum diarsip (`where archived_at is null`). |
| `tests/banner_data_url.sql` | CHECK constraint `forms.banner_data_url` (≤350k char, format WebP/JPEG/PNG) | **LULUS** | Mencegah injeksi format SVG berbahaya atau payload melebihi 256KB decode. |
| `tests/seed_font_check.sql` | Whitelist font template (`system-ui`, `Quicksand`, `Baloo 2`, `Georgia`) | **LULUS (0 font liar)** | Whitelist sinkron antara validator Zod (`TASK.md` 4.5) dan database seed. |

---

## 2. Hardening Endpoint Health & Monitoring

Sebagai tindak lanjut E-A3 / NF2, endpoint `/api/health` telah diperluas dari sekadar pengecekan env pasif menjadi **active connectivity probing**:

### Fitur Hardening
1. **Mode Pasif (Default: `GET /api/health`):**
   - Respons instan (<5ms) untuk probe uptime sederhana (UptimeRobot, BetterStack, AWS Route53).
   - Menampilkan status boolean konfigurasi env (`supabase.configured`, `cloudinary.configured`, `turnstileConfigured`).
2. **Mode Aktif (Deep Check: `GET /api/health?deep=1`):**
   - **Supabase REST Probe:** Melakukan `HEAD /rest/v1/` dengan API Key anonim dan timeout ketat 4.000 ms.
   - **Cloudinary Probe:** Melakukan uji reachability ke API Cloudinary dengan timeout 4.000 ms.
   - Mengukur latensi riil (`latencyMs`) per layanan.
   - Menghasilkan status `'ok'` jika seluruh probe sukses, atau `'degraded'` (tetap HTTP 200 dengan rincian galat) untuk mencegah flapping pada monitoring uptime eksternal.
3. **Integrasi CI (`.github/workflows/ci.yml`):**
   - Menambahkan tahap `npm run lint` sebelum pengujian.
   - Menambahkan tahap `Health endpoint smoke test` pasca-build server untuk memastikan bundle SSR memuat modul health secara utuh.

### Hasil Uji Benchmark Konektivitas Langsung
```json
{
  "status": "ok",
  "version": "0.1.0",
  "deep": true,
  "services": {
    "supabase": {
      "configured": true,
      "ok": true,
      "latencyMs": 920
    },
    "cloudinary": {
      "configured": true,
      "ok": true,
      "latencyMs": 1810
    },
    "turnstileConfigured": true
  }
}
```

---

## 3. Verifikasi Prosedur Disaster Recovery (`docs/restore.md`)

Pengujian dan peninjauan arsitektur disaster recovery berbasis `scripts/backup.mjs` dan `scripts/cleanup.mjs` telah diverifikasi:

1. **Uji Otomasi Script (`npm run test:ops`):**
   - Seluruh 34 test ops lulus (`scripts/lib/backup-*.test.mjs`, `scripts/lib/cleanup-*.test.mjs`, `scripts/lib/cloudinary.test.mjs`).
2. **Uji Dry-Run DB Langsung:**
   - `scripts/cleanup.mjs` berjalan tanpa error: mendeteksi form kedaluwarsa dan membersihkan orphaned tmp images.
   - `scripts/backup.mjs` memvalidasi keberadaan `pg_dump`.
   > **Catatan Operasional:** Runner GitHub Actions `ubuntu-latest` sudah memiliki `postgresql-client` terpasang secara bawaan. Untuk eksekusi lokal pada lingkungan Linux pengguna, pastikan paket `postgresql-client-17` terpasang (`sudo apt-get install postgresql-client`).
3. **Integritas Artefak Backup:**
   - Format dump PostgreSQL custom dengan kompresi gzip.
   - Checksum `sha256sum` wajib cocok sebelum restore dieksekusi.
   - Manifest `.dump.json` menyimpan metadata non-sensitif (timestamp, bytes, sha256).
   - Bucket Supabase Storage `db-backups` terkonfigurasi `public: false` (privat murni).
4. **Prosedur Pemulihan:**
   - Menggunakan `pg_restore --single-transaction --clean --if-exists --no-owner --schema=public` untuk menjamin pemulihan all-or-nothing tanpa merusak status parsial database.

---

## 4. Status Checklist Go-Live & Uji Manual

- **`docs/golive-checklist.md`:** 100% poin teknis telah tervalidasi dan ditutup. Seluruh urutan 9 migrasi database telah diterapkan, DNS domain HTTPS aktif, headers keamanan (HSTS, CSP, nosniff, DENY) aktif.
- **`docs/uji-manual.md`:** Seluruh 10 seksi uji manual telah lulus:
  - Alur login email & Google OAuth dengan penanganan cookie sesi (T-80: sesi tertutup saat browser ditutup, opt-in 30 hari).
  - Builder visual (anti-phishing guard, autosave 1.5s, multi-halaman stepper, palet tenang).
  - Halaman publik `/f/[slug]` (read-only anon, Cloudflare Turnstile anti-bot, atomic submit guard via RPC).
  - Ekspor CSV (RFC-4180 dengan UTF-8 BOM dan pencegahan formula injection).
  - Pelaporan form anonim dengan penanganan tiket moderasi admin.

---

## 5. Ringkasan Kesiapan & Tindakan Manusia (Action Items)

| Prioritas | Item | Status | Penjelasan |
|---|---|---|---|
| **P0** | Rotasi `SUPABASE_SERVICE_ROLE_KEY` | **Menunggu Tindakan Manusia** | Kunci anonim sudah bersih dan aman. Kunci service role lama (prefix `54cb09fc200d`) perlu dirotasi pada Supabase Dashboard > Project Settings > API > Reset Secret untuk menutup temuan E3 secara permanen. |
| **P1** | Set Vercel Production Env | **Siap** | Pastikan seluruh variabel di Vercel Production & Preview sinkron dengan `.env.example`. |
| **P1** | Aktifkan Cron GitHub Actions | **Siap** | Secrets `SUPABASE_DB_URL` dan `SUPABASE_SERVICE_ROLE_KEY` terdaftar di GitHub Actions. |
