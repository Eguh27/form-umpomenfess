-- ============================================================================
-- E-A5: Kolom Retensi & Pengarsipan Form (archived_at)
-- ============================================================================
-- Menambahkan kolom archived_at pada tabel forms untuk mendukung kebijakan
-- retensi data dan pengarsipan form lama tanpa penghapusan permanen.
-- ============================================================================

alter table public.forms
  add column if not exists archived_at timestamptz null;

create index if not exists idx_forms_archived_at
  on public.forms (archived_at)
  where archived_at is not null;

comment on column public.forms.archived_at is
  'Waktu form diarsipkan; null = aktif; terisi = diarsipkan (tidak menerima respons baru).';

-- Perbarui view publik agar mengekspos archived_at di akhir
create or replace view public.public_forms
  with (security_invoker = false)
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
    banner_data_url,
    archived_at
  from public.forms
  where status = 'published'
    and deleted_at is null;

grant select on public.public_forms to anon, authenticated;

notify pgrst, 'reload schema';
