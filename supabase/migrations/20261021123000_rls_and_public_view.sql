-- ============================================================================
-- T-11 (Agent A): RLS sesuai TASK.md 4.4 + view publik kolom-aman
--
-- Model akses:
-- - Pemilik (authenticated): CRUD penuh `forms` & `form_images` miliknya;
--   SELECT `responses` hanya milik formnya sendiri.
-- - Anonim  : TIDAK DAPAT membaca tabel langsung sama sekali (termasuk forms).
--             Hanya membaca form published via VIEW `public_forms` (kolom aman,
--             tanpa owner_id).
-- - Server (service_role): bypass RLS — satu-satunya jalur INSERT `responses`,
--             setelah validasi schema/answers/rate-limit di endpoint Agent C.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Aktifkan RLS — WAJIB di semua tabel (AGENTS.md bagian 5)
-- ---------------------------------------------------------------------------
alter table public.forms        enable row level security;
alter table public.form_images  enable row level security;
alter table public.responses    enable row level security;
alter table public.reports      enable row level security;
alter table public.templates    enable row level security;

-- ---------------------------------------------------------------------------
-- forms — pemilik CRUD penuh; publik TANPA policy SELECT (wajib lewat view)
-- ---------------------------------------------------------------------------
create policy "forms_select_own" on public.forms
  for select to authenticated
  using (owner_id = auth.uid());

create policy "forms_insert_own" on public.forms
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy "forms_update_own" on public.forms
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "forms_delete_own" on public.forms
  for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- form_images — pemilik CRUD penuh
-- ---------------------------------------------------------------------------
create policy "form_images_select_own" on public.form_images
  for select to authenticated
  using (owner_id = auth.uid());

create policy "form_images_insert_own" on public.form_images
  for insert to authenticated
  -- upload "tmp" boleh tanpa form; tanda tangan endpoint sudah cek limit (T-42)
  with check (owner_id = auth.uid());

create policy "form_images_update_own" on public.form_images
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "form_images_delete_own" on public.form_images
  for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- responses — pemilik form boleh BACA; TIDAK ADA policy INSERT/UPDATE/DELETE
-- (dari browser tidak pernah bisa menulis; hanya service role lewat endpoint)
-- ---------------------------------------------------------------------------
create policy "responses_select_own" on public.responses
  for select to authenticated
  using (
    exists (
      select 1 from public.forms f
      where f.id = responses.form_id and f.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- VIEW publik: satu-satunya pintu baca anonim (TASK 4.4 "kolom aman")
-- Dibuat DULUAN di sini karena policy reports di bawah mereferensikannya.
-- Kolom yang DISENGGAJA dihilangkan: owner_id, status, deleted_at, tier.
-- Baris yang tampil: hanya published & belum dihapus.
-- security_invoker = false (default) supaya policy RLS tabel sumber tidak
-- memblokir anon — pemilik view (postgres) yang mengevaluasi akses.
-- ---------------------------------------------------------------------------
create view public.public_forms
  with (security_invoker = false)
as
  select
    id,
    slug,
    title,
    schema,          -- sudah divalidasi whitelist; teks user tetap di-escape saat render
    schema_version,
    version,
    closes_at,
    max_responses,
    created_at,
    updated_at
  from public.forms
  where status = 'published'
    and deleted_at is null;

grant select on public.public_forms to anon, authenticated;

-- ---------------------------------------------------------------------------
-- reports — responden (anonim & login) boleh hanya MELAPORKAN form published.
-- Pengecekan "published" lewat view publik (jalan sebagai owner view, bukan
-- invoker) sehingga tidak terkena RLS tabel forms.
-- Tidak ada policy SELECT/UPDATE/DELETE — admin kelak bisa review lewat
-- service role; ANALOG untuk moderation MVP.
-- ---------------------------------------------------------------------------
create policy "reports_insert_any_published" on public.reports
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.public_forms pf
      where pf.id = form_id
    )
  );

-- ---------------------------------------------------------------------------
-- templates — katalog publik: siapa pun boleh baca; menulis hanya service role
-- ---------------------------------------------------------------------------
create policy "templates_select_all" on public.templates
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Sanity-check cepat (jalankan manual psql/SQL Editor):
--   set role anon;
--   select count(*) from public.forms;    -- HARUS error (RLS tanpa policy)
--   select count(*) from public.public_forms;  -- boleh (hanya published)
--   insert into public.responses(form_id, form_version, answers) values (null, 1, '{}'); -- HARUS error
--   reset role;
-- Test otomatis penyeluruh ada di T-12 (butuh project Supabase nyata + env).
-- ---------------------------------------------------------------------------
