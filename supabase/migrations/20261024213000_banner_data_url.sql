-- ============================================================================
-- Ruang Banner Base64 (T-74)
-- ============================================================================
-- Tujuan:
--   Banner BARU disimpan terkompresi di kolom khusus (bukan schema/theme dan
--   bukan Cloudinary) supaya:
--     * tidak ikut setiap autosave schema (menghindari TOAST/WAL churn),
--     * tidak terbawa query list/respons/CSV,
--     * tetap divalidasi server-side lewat CHECK — builder menyimpan langsung
--       ke Supabase, jadi tidak ada endpoint yang bisa menolak payload.
--   Banner legacy (schema.theme.bannerPublicId) tetap dibaca sebagai fallback.
-- ============================================================================

alter table public.forms
  add column if not exists banner_data_url text;

alter table public.forms
  drop constraint if exists forms_banner_data_url_check;

alter table public.forms
  add constraint forms_banner_data_url_check check (
    banner_data_url is null
    or (
      char_length(banner_data_url) <= 350000
      and banner_data_url ~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$'
      and octet_length(decode(split_part(banner_data_url, ',', 2), 'base64')) <= 262144
    )
  );

comment on column public.forms.banner_data_url is
  'Banner data URL (WebP/JPEG/PNG) maks 350k karakter / 256 KiB decoded; null = tanpa banner.';

-- View publik: kolom baru HARUS ditambahkan di akhir agar create-or-replace sah.
create or replace view public.public_forms
  with (security_invoker = true)
as
  select
    id,
    slug,
    title,
    schema,
    schema_version,
    version,
    closes_at,
    max_responses,
    created_at,
    updated_at,
    banner_data_url
  from public.forms
  where status = 'published'
    and deleted_at is null;

grant select on public.public_forms to anon, authenticated;

-- PostgREST memuat ulang skema agar kolom langsung terlihat.
notify pgrst, 'reload schema';
