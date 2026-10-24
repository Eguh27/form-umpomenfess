# supabase/ — Migration & Database

Project Supabase BARU khusus form (bukan punya situs menfess). Env ada di `.env.local` (lihat `.env.example` untuk cara mengambil kredensial).

## Cara menjalankan migrasi

Migrasi dijalankan berurutan sesuai nama file:

1. `20261021122500_init_schema.sql` — tabel + indeks + trigger (T-10)
2. `20261021123000_rls_and_public_view.sql` — RLS + view publik (T-11)
3. `20261021124000_seed_templates.sql` — katalog template awal (T-14)
4. `20261022174000_submit_guard.sql` — kolom `client_token` + rpc submit atomik
5. `20261022190000_seed_font_update.sql` — whitelist font Quicksand/Baloo 2
6. `20261022200000_reports_moderation.sql` — kolom moderasi laporan
7. `20261024213000_banner_data_url.sql` — kolom banner base64 + view publik (T-74)

### Opsi A — Supabase CLI (disarankan)

```sh
npx supabase login
npx supabase link --project-ref <PROJECT_REF>   # bagian URL project sebelum ".supabase.co"
npx supabase db push                             # menerapkan semua migrasi urut
```

### Opsi B — SQL Editor di Dashboard

Buka Supabase Dashboard → SQL Editor → salin-tempel isi tiap file migrasi SESUAI URUTAN → Run.

## Test RLS (T-12)

Skrip: `tests/rls.sql` (hanya jalankan di project DEV/THROWAWAY, bukan data produksi). Jalankan setelah migrasi terpasang:

```sh
psql "$DATABASE_URL" -f tests/rls.sql
# atau salin-tempel ke SQL Editor
```

Kredensial service role TIDAK PERBOLEHKAN masuk repo — script menerima kredensial via env/psql args.
