# scripts/ — Cleanup & Backup (Agent D, Wave 3)

Skrip ops untuk T-60/T-61. **Default selalu DRY-RUN**; tidak ada perubahan data
tanpa flag `--apply`. Semua kredensial dibaca dari env dan tidak pernah dicetak.

## Isi

| File | Fungsi |
|---|---|
| `cleanup.mjs` | CLI cleanup harian/mingguan |
| `backup.mjs` | CLI dump database + unggah ke Supabase Storage |
| `lib/cleanup-*.mjs` | Query DB, rencana murni, orkestrasi, laporan |
| `lib/cloudinary.mjs` | Admin API Cloudinary (list by prefix, delete by public_id) |
| `lib/backup-*.mjs` | Nama objek, manifest, retensi, orkestrasi |
| `lib/pg-dump.mjs` | Pembungkus `pg_dump` (schema `public`) |

## Menjalankan lokal

```sh
# Cleanup harian, dry-run (hanya baca)
node --env-file=.env.local scripts/cleanup.mjs

# Cleanup mingguan + terapkan
node --env-file=.env.local scripts/cleanup.mjs --weekly --apply

# Backup dry-run (butuh pg_dump; tidak menyentuh DB)
node --env-file=.env.local scripts/backup.mjs

# Backup nyata
node --env-file=.env.local scripts/backup.mjs --apply
```

Env cleanup: `PUBLIC_SUPABASE_URL`/`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
Env backup tambahan: `SUPABASE_DB_URL` (connection string Postgres, **bukan**
anon key), `BACKUP_BUCKET` (default `db-backups`).

`SUPABASE_DB_URL` sebaiknya memakai **Session Pooler** Supabase
(`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<project-ref>`)
karena koneksi direct IPv6 sering tidak tersedia di runner GitHub.

## Cleanup (T-60)

| Jadwal | Tindakan |
|---|---|
| Harian | Tutup form `published` yang lewat `closes_at`; hapus gambar `tmp` > 24 jam (Cloudinary + baris DB) |
| Mingguan | Semua tugas harian + hapus aset orphan > 24 jam + hard delete form `deleted_at` > 30 hari + laporan form tidak aktif 6 bulan |

Pengaman:
- Dry-run default; `--apply` wajib.
- Hanya publicId folder `form/` yang boleh dihapus.
- Orphan tidak dihapus jika keep-set DB gagal dimuat (fail-safe).
- Aset tanpa `created_at` valid tidak dihapus.
- Baris `form_images` hanya dihapus jika Cloudinary menyatakan aset `deleted`
  atau `not found`; kegagalan lain dicatat dan diulang pada jadwal berikutnya.
- Gambar tmp yang ternyata masih dirujuk schema form **tidak dihapus**; barisnya
  ditandai `state='used'` (pengaman sampai builder menandai used sendiri).
- Form soft-deleted hanya dipurge jika **semua** asetnya sudah hilang.
- Orphan dibatasi `--max-orphans` (default 500) dan listing `--max-pages`
  (default 10 × 500 aset) per run.
- Angka default TTL/retensi mengikuti `src/lib/config/limits.ts`
  (`tmpImageTtlHours`, `softDeleteRetentionDays`). Ubah keduanya bersamaan.

Form tidak aktif 6 bulan hanya **dilaporkan**; skema belum punya kolom arsip.
Jika ingin penandaan permanen, minta Agent A menambah kolom (mis. `archived_at`).

### Catatan Cloudinary

Kode upload saat ini mengirim `folder=form` **dan** `public_id=form/...`.
Cloudinary menambahkan `folder` ke depan `public_id`, sehingga aset bisa
tersimpan sebagai `form/form/...`. Cleanup tetap aman karena memindai prefix
`form/`, tetapi alur upload perlu diverifikasi saat uji live. Jika benar
teralih, perbaiki sisi upload (kirim salah satu saja). Sudah dicatat di
`TODO.md` bagian Requests.

## Backup (T-61)

- `pg_dump --format=custom --schema=public` → bucket Storage privat
  (`db-backups` default), folder `weekly/`.
- Setiap backup menghasilkan tiga objek: `.dump`, `.sha256`, `.json` (manifest).
- Ukuran objek diverifikasi setelah unggah.
- Retensi default 90 hari, selalu menyimpan minimal 8 backup terbaru.
- Bucket dibuat otomatis sebagai privat bila belum ada.
- Panduan restore: [`docs/restore.md`](../docs/restore.md).

Backup **tidak** memuat `auth.users` dan berkas Cloudinary. Lihat batasan di
docs restore sebelum mengandalkannya untuk disaster recovery.

## GitHub Actions

| Workflow | Jadwal | Variabel untuk mode nyata |
|---|---|---|
| `.github/workflows/cleanup.yml` | Harian 03:15 UTC; mingguan Minggu 03:45 UTC | `CLEANUP_APPLY=true` |
| `.github/workflows/backup.yml` | Minggu 04:30 UTC | `BACKUP_APPLY=true` |

Secrets yang dibutuhkan: `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPABASE_DB_URL`.
`SUPABASE_URL` boleh memakai secret `PUBLIC_SUPABASE_URL` yang sudah ada.
Repository variables opsional: `CLEANUP_APPLY`, `BACKUP_APPLY`, `BACKUP_BUCKET`.

Urutan go-live: biarkan dry-run beberapa siklus, periksa log, baru set variabel
`*_APPLY=true`. Kedua workflow juga menjalankan test sebelum eksekusi.

## Test

```sh
npx vitest run --config scripts/vitest.config.mjs
```

Root `npm test` sengaja hanya mengikutkan `src/**` (config milik Agent L).
Test skrip memakai adapter palsu; **tidak** menghubungi Supabase/Cloudinary.
Minta Agent L menambahkan `scripts/**/*.test.mjs` ke config root bila ingin
ikut `npm test`.
