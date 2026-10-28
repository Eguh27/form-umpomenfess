-- ============================================================================
-- tests/public_forms_readonly.sql — regresi view publik (T-81, @L)
-- ============================================================================
-- Memastikan kontrak keamanan `public_forms`:
--   1. security_invoker = on (view dievaluasi sebagai pemanggil, RLS berlaku).
--   2. Policy SELECT published hanya untuk anon (publik memakai klien anon).
--   3. anon bisa membaca view, tetapi TIDAK bisa INSERT/UPDATE/DELETE lewat view.
--
-- Jalankan di SQL Editor / psql. Skrip selalu ROLLBACK dan tidak menulis data.
-- ============================================================================

begin;

do $$
declare
  opts text[];
  n integer;
begin
  select reloptions into opts
  from pg_class
  where oid = 'public.public_forms'::regclass;

  if opts is null or not ('security_invoker=true' = any(opts)) then
    raise exception '[GAGAL] public_forms bukan security_invoker=true (opsi: %)', opts;
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and tablename = 'forms'
    and policyname = 'forms_select_published_anon';
  if n <> 1 then
    raise exception '[GAGAL] policy SELECT published untuk anon tidak ada';
  end if;

  select count(*) into n
  from pg_policies
  where schemaname = 'public'
    and tablename = 'forms'
    and policyname = 'forms_select_published_authenticated';
  if n <> 0 then
    raise exception '[GAGAL] policy published authenticated masih ada (bocor owner_id)';
  end if;

  set local role anon;

  -- Baca view harus boleh (0 baris pun sah bila belum ada form published).
  select count(*) into n from public.public_forms;

  begin
    update public.public_forms set title = title where false;
    raise exception '[GAGAL] anon dapat UPDATE public_forms';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.public_forms where false;
    raise exception '[GAGAL] anon dapat DELETE public_forms';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.public_forms (slug, title, schema, schema_version, version)
      values ('uji-view-write', 'x', '{}'::jsonb, 1, 1);
    raise exception '[GAGAL] anon dapat INSERT public_forms';
  exception when insufficient_privilege then
    null;
  end;

  reset role;
  raise notice 'SEMUA CHECK PUBLIC_FORMS READONLY LOLOS';
end
$$;

rollback;
