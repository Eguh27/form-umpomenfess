# Restore Database — Panduan Darurat (T-61)

Dokumen ini untuk Agent D / manusia yang perlu memulihkan data dari backup
mingguan. Backup dibuat oleh `scripts/backup.mjs` (lihat `scripts/README.md`).

> **Baca dulu batasannya.** Backup ini adalah dump schema `public` dari
> PostgreSQL. Backup **tidak** memuat user Supabase Auth (`auth.users`),
> berkas gambar Cloudinary, maupun objek Storage lain. Untuk kehilangan total
> project, gunakan backup/PITR milik Supabase atau hubungi support; dump ini
> adalah lapisan kedua untuk data aplikasi.

## 1. Artefak backup

Setiap run menghasilkan tiga objek di bucket privat (default `db-backups`,
folder `weekly/`):

```
weekly/umpomenfess-20261022t031500z.dump          # pg_dump format custom
weekly/umpomenfess-20261022t031500z.dump.sha256   # checksum sha256sum
weekly/umpomenfess-20261022t031500z.dump.json     # manifest (ukuran, versi, host)
```

Retensi default 90 hari dan minimal 8 backup terbaru. Manifest tidak memuat
secret maupun isi jawaban.

## 2. Prasyarat

- `pg_restore` / `psql` versi **sama atau lebih baru** dari server Supabase
  (contoh: PostgreSQL 17).
- `SUPABASE_DB_URL` (Session Pooler, user `postgres.<project-ref>`), bukan anon
  key. Simpan hanya di shell/session, jangan di repo.
- Akses ke Supabase Dashboard dengan role Owner/Admin untuk mengunduh objek
  bucket privat.
- Untuk skenario "data rusak di project yang sama": izin untuk menghentikan
  penulisan sementara (maintenance).

## 3. Unduh & verifikasi

1. Supabase Dashboard → **Storage** → bucket `db-backups` → folder `weekly/`.
2. Unduh ketiga file backup terbaru ke folder aman di luar repo.
3. Verifikasi checksum:

```sh
cd /path/ke/backup
sha256sum -c umpomenfess-20261022t031500z.dump.sha256
# macOS: shasum -a 256 -c umpomenfess-20261022t031500z.dump.sha256
```

4. Cocokkan `bytes` dan `sha256` di manifest `.json` dengan hasil unduhan.
   Jika tidak cocok, **jangan restore**; unduh ulang atau pilih backup lain.

## 4. Pilih skenario restore

### A. Data aplikasi rusak, project & Auth masih ada (paling umum)

Ini satu-satunya skenario yang didukung penuh oleh dump ini karena
`forms.owner_id` merujuk `auth.users.id` yang masih ada.

1. **Ambil backup pengaman** sebelum menyentuh database:
   ```sh
   node --env-file=.env.local scripts/backup.mjs --apply
   ```
2. Hentikan penulisan aplikasi (set sementara `CLEANUP_APPLY`/`BACKUP_APPLY`
   tetap dry-run, minta pengguna berhenti submit, atau aktifkan maintenance).
3. Restore ke schema `public`:
   ```sh
   export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
   pg_restore \
     --dbname="$SUPABASE_DB_URL" \
     --schema=public \
     --clean --if-exists \
     --no-owner \
     --single-transaction \
     --verbose \
     umpomenfess-20261022t031500z.dump
   ```
   `--single-transaction` membuat restore all-or-nothing. Jika ada error
   (mis. extension sudah ada), transaksi dibatalkan dan database lama utuh.
4. Lanjut ke bagian 5 (verifikasi).

### B. Project hilang total / pindah project

Dump ini **tidak cukup** untuk memulihkan login Google karena `auth.users`
tidak disertakan. Langkah yang mungkin:

1. Pulihkan project lewat backup/PITR Supabase atau support Supabase.
2. Jika itu tidak tersedia, buat project baru, jalankan migrasi di
   `supabase/migrations/` untuk membuat schema + RLS.
3. Restore **data** dengan `pg_restore --data-only --schema=public ...`
   setelah memastikan setiap `owner_id` sudah ada di `auth.users` project baru.
   Tanpa user dengan UUID yang sama, foreign key akan gagal.
4. Data yang tidak bisa dipulihkan: user Auth, sesi, dan berkas Cloudinary.
   Pemilik form perlu login ulang; gambar perlu diunggah ulang atau dipulihkan
   dari backup Cloudinary bila tersedia.

Jangan menganggap skenario B selesai sebelum login, RLS, dan submit form diuji.

### C. Hanya butuh beberapa baris

Gunakan `pg_restore --data-only --table=<nama_tabel>` ke database sementara,
lalu salin baris yang dibutuhkan dengan `INSERT ... ON CONFLICT DO NOTHING`.
Jangan restore seluruh schema ke production hanya untuk satu tabel.

## 5. Verifikasi pasca-restore

Jalankan di SQL Editor / `psql`:

```sql
-- Jumlah data utama
select 'forms' as tabel, count(*) from public.forms
union all select 'responses', count(*) from public.responses
union all select 'form_images', count(*) from public.form_images
union all select 'templates', count(*) from public.templates;

-- RLS harus aktif di semua tabel publik
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

-- Policy harus ikut ter-restore
select count(*) from pg_policies where schemaname = 'public';

-- View publik ada
select count(*) from public.public_forms;
```

Checklist aplikasi:

- [ ] Login Google berhasil; dashboard menampilkan form milik sendiri.
- [ ] User lain tidak bisa melihat respons/form orang lain (uji dengan 2 akun).
- [ ] `/f/<slug>` form published tampil, form draft/closed tidak.
- [ ] Submit form berhasil (Turnstile aktif) dan respons muncul di dashboard.
- [ ] Export CSV hanya untuk pemilik; user lain mendapat 404.
- [ ] `tests/rls.sql` dijalankan di project dev/throwaway bila perlu.
- [ ] Cleanup & backup terjadwal kembali (cek workflow, `*_APPLY`).

## 6. Rollback

- Jika restore gagal di tengah jalan dengan `--single-transaction`, tidak ada
  perubahan; perbaiki error lalu ulangi.
- Jika restore berhasil tetapi data salah, restore backup pengaman dari
  langkah 4A.1 dengan perintah yang sama.
- Jangan menjalankan `--clean` tanpa backup pengaman di project production.

## 7. Keamanan & retensi

- Dump memuat jawaban responden (data pribadi). Bucket wajib **privat**;
  jangan pernah commit dump ke git (`.gitignore` sudah menutup `*.dump`,
  `*.sql.gz`, `backups/`).
- Batasi akses bucket ke service role/admin. Jangan membagikan signed URL.
- Hapus salinan lokal setelah restore selesai:
  ```sh
  rm -f umpomenfess-*.dump umpomenfess-*.dump.sha256 umpomenfess-*.dump.json
  ```
- Jika dump atau service role bocor, rotasi `SUPABASE_SERVICE_ROLE_KEY` dan
  `CLOUDINARY_API_SECRET`, lalu audit akses bucket.
- Uji restore minimal sekali sebelum go-live (T-66), memakai project
  dev/throwaway — bukan production.
