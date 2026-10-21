-- ============================================================================
-- T-10 (Agent A): schema tabel MVP — TASK.md 4.3
--
-- Catatan desain (baca juga: TASK.md 4.5):
-- - `forms.schema`  : JSON lengkap TASK 4.5 (schemaVersion + theme + blocks) yang
--   sudah lolos parseFormSchema() dari src/lib/forms/schema.ts.
-- - `forms.theme`   : KOPI denormalisasi dari schema.theme untuk query listing
--   dashboard tanpa membongkar schema. Jangan dianggap sumber kebenaran.
-- - deleted_at      : soft delete; hard delete via cleanup job (Agent D, Wave 3).
-- - version         : naik tiap publish/validasi baru; responses.form_version
--   merujuk versi schema yang dijawab responden.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- forms
-- ---------------------------------------------------------------------------
create table public.forms (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid        not null references auth.users (id) on delete cascade,
  slug           text        not null,
  title          text        not null,
  status         text        not null default 'draft' check (status in ('draft', 'published', 'closed')),
  schema         jsonb       not null,
  theme          jsonb       not null,
  schema_version integer     not null default 1,
  version        integer     not null default 1,
  tier           text        not null default 'free',
  closes_at      timestamptz,
  max_responses  integer,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- slug hanya huruf kecil/angka/strip (TASK 4.3); slug dicadangkan dicek di server
  constraint forms_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 1 and 80),
  constraint forms_title_len check (char_length(title) between 1 and 200),
  constraint forms_max_responses_positive check (max_responses > 0)
);

-- slug unik di seluruh tabel (draft juga) — collision dicegah dari sumbernya
create unique index forms_slug_unique on public.forms (slug);

create index forms_owner_idx on public.forms (owner_id);
create index forms_owner_active_idx on public.forms (owner_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- form_images (banner/gambar milik pembuat; state tmp saat upload belum dipakai)
-- ---------------------------------------------------------------------------
create table public.form_images (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid     references public.forms (id) on delete set null,
  owner_id   uuid     not null references auth.users (id) on delete cascade,
  public_id  text     not null,
  bytes      integer  not null check (bytes > 0),
  state      text     not null default 'tmp' check (state in ('tmp', 'used')),
  created_at timestamptz not null default now(),

  constraint form_images_public_id_format
    check (public_id ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{0,199}$')
);

-- satu public_id cukup sekali terdaftar (idempoten upload)
create unique index form_images_public_id_unique on public.form_images (public_id);

create index form_images_owner_idx on public.form_images (owner_id);
create index form_images_form_idx on public.form_images (form_id);
-- untuk cleanup harian job Agent D: tmp > 24 jam
create index form_images_tmp_created_idx on public.form_images (created_at)
  where state = 'tmp';

-- ---------------------------------------------------------------------------
-- responses (HANYA ditulis lewat endpoint server dengan service role — TASK 4.4)
-- ---------------------------------------------------------------------------
create table public.responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid        not null references public.forms (id) on delete cascade,
  form_version integer     not null,
  answers      jsonb       not null,
  created_at   timestamptz not null default now(),

  constraint responses_form_version_positive check (form_version > 0)
);

-- listing respons terbaru + agregasi per form
create index responses_form_created_idx on public.responses (form_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports ("Laporkan form" — bisa dari responden anonim)
-- ---------------------------------------------------------------------------
create table public.reports (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid        not null references public.forms (id) on delete cascade,
  reason     text        not null,
  created_at timestamptz not null default now(),

  constraint reports_reason_len check (char_length(reason) between 1 and 500)
);

create index reports_form_created_idx on public.reports (form_id, created_at desc);

-- ---------------------------------------------------------------------------
-- templates (katalog template awal; ditulis hanya lewat seed/migrasi)
-- ---------------------------------------------------------------------------
create table public.templates (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  preview_url text,
  schema      jsonb       not null,
  theme       jsonb       not null,
  tier        text        not null default 'free',

  constraint templates_name_len check (char_length(name) between 1 and 120)
);

create unique index templates_name_unique on public.templates (name);

-- ---------------------------------------------------------------------------
-- Trigger updated_at untuk forms
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();
