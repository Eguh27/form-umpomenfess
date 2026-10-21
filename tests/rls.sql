-- ============================================================================
-- tests/rls.sql — Test RLS (TUGAS T-12, Agent A) sesuai TASK.md 9 WS-A:
--   user A tidak bisa baca/ubah form/respons user B; publik tidak bisa membaca
--   respons; hanya form published yang terbaca publik.
--
-- CARA JALANKAN (setelah kedua migrasi di supabase/migrations dieksekusi):
--   1. Buat DUA akun test lewat UI/autentikasi Supabase (mis. a@x.test & b@x.test).
--   2. Ambil UUID kedua user:  select id, email from auth.users;
--   3. Isi placeholder <USER_A_UUID> / <USER_B_UUID> di konstanta di bawah,
--      lalu jalankan file ini di SQL Editor (atau psql).
--   4. Skrip berjalan dalam SATU transaksi dan selalu ROLLBACK — tidak
--      meninggalkan data. Semua ketidaksamaan memicu RAISE EXCEPTION.
--
-- Jangan jalankan di database yang berisi data penting (walau rollback, tetap
-- sebaiknya project DEV/THROWAWAY).
-- ============================================================================

begin;

do $$
declare
  user_a uuid := 'd2c2b24e-ce59-4b81-a139-ffb597f0623a'::uuid; -- a@dummy.test
  user_b uuid := '8466e803-ca39-4d28-8baa-284e7a827d3c'::uuid; -- b@dummy.test
  dummy_schema jsonb := '{"schemaVersion":1,"theme":{"bg":"#f7fcfc","accent":"#ec4899","text":"#1f2937","font":"Poppins","radius":16,"cardStyle":"menfess","bannerPublicId":null},"blocks":[{"id":"b1","type":"heading","text":"Test","size":"m","align":"left"},{"id":"q1","type":"question","kind":"short_text","label":"Nama","required":true}]}'::jsonb;
  form_a_draft uuid;
  form_a_published uuid;
  form_b_draft uuid;
  count_tmp integer;
begin
  ------------------------------------------------------------------ setup ---
  -- Form milik A: satu draft, satu published
  insert into public.forms (owner_id, slug, title, schema, theme, status)
    values (user_a, 'test-rs-a-draft', 'Draft Atas', dummy_schema, dummy_schema->'theme', 'draft')
    returning id into form_a_draft;
  insert into public.forms (owner_id, slug, title, schema, theme, status)
    values (user_a, 'test-rs-a-pub', 'Publik Atas', dummy_schema, dummy_schema->'theme', 'published')
    returning id into form_a_published;

  -- Form milik B
  insert into public.forms (owner_id, slug, title, schema, theme, status)
    values (user_b, 'test-rs-b-draft', 'Draft B', dummy_schema, dummy_schema->'theme', 'draft')
    returning id into form_b_draft;

  -- Satu respons terhadap form A (disimulasikan ditulis service role)
  insert into public.responses (form_id, form_version, answers)
    values (form_a_published, 1, '{"q1":"tester"}'::jsonb);

  -- ---------------------------------------------------------------- rules ---

  -- [R1] Anon tidak boleh SELECT tabel langsung (RLS tanpa policy → 0 baris)
  set local role anon;
  select count(*) into count_tmp from public.forms;
  if count_tmp <> 0 then
    raise exception '[GAGAL] anon dapat membaca public.forms (% baris)', count_tmp;
  end if;
  select count(*) into count_tmp from public.public_forms
    where slug = 'test-rs-a-pub';
  if count_tmp = 0 then
    raise exception '[GAGAL] anon tidak dapat membaca form published via public_forms';
  end if;

  -- [R2] Anon TIDAK melihat draft di view
  select count(*) into count_tmp from public.public_forms
    where slug in ('test-rs-a-draft', 'test-rs-b-draft');
  if count_tmp <> 0 then
    raise exception '[GAGAL] draft bocor ke public_forms (% baris)', count_tmp;
  end if;

  -- [R3] Anon TIDAK bisa INSERT responses (hanya service role)
  begin
    insert into public.responses (form_id, form_version, answers)
      values (form_a_published, 1, '{"q1":"halo"}'::jsonb);
    raise exception '[GAGAL] anon dapat INSERT responses (harusnya ditolak)';
  exception when insufficient_privilege then
    null;
  end;

  -- [R4] Anon hanya boleh melaporkan form published (lewat view)
  begin
    insert into public.reports (form_id, reason) values (form_a_draft, 'uji draft');
    raise exception '[GAGAL] anon dapat melaporkan form draft';
  exception when insufficient_privilege then
    null; -- pelanggaran policy RLS (with check) = 42501, bukan check_violation
  end;
  insert into public.reports (form_id, reason) values (form_a_published, 'uji publik');

  -- [R5] user A: baca/tulis punya sendiri
  reset role;
  set local role authenticated;
  select set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', user_a), true);

  select count(*) into count_tmp from public.forms
    where owner_id = user_a;
  if count_tmp <> 2 then
    raise exception '[GAGAL] user A tidak melihat 2 form miliknya (ada %)', count_tmp;
  end if;

  -- [R6] user A TIDAK bisa membaca/ubah form milik B
  select count(*) into count_tmp from public.forms
    where owner_id = user_b;
  if count_tmp <> 0 then
    raise exception '[GAGAL] user A dapat membaca form milik B (% baris)', count_tmp;
  end if;
  begin
    update public.forms set title = 'DIRETAS' where slug = 'test-rs-b-draft';
    if found then
      raise exception '[GAGAL] user A berhasil mengubah form milik B';
    end if;
  end;

  -- [R7] user A membaca respons pada form miliknya, TIDAK respons form B
  select count(*) into count_tmp from public.responses
    where form_id = form_a_published;
  if count_tmp <> 1 then
    raise exception '[GAGAL] user A tidak bisa membaca respons miliknya';
  end if;

  -- [R8] user A tidak bisa mengedit respons (tidak ada policy UPDATE)
  begin
    update public.responses set answers = '{"q1":"dirubah"}'::jsonb
      where form_id = form_a_published;
    if found then
      raise exception '[GAGAL] user A dapat mengubah respons (harusnya ditolak)';
    end if;
  exception when insufficient_privilege then
    null;
  end;

  -- [R9] user A TIDAK membaca respons terhadap form milik B
  --      (buat respons untuk form B lewat service role dulu)
  reset role;
  insert into public.responses (form_id, form_version, answers)
    values (form_b_draft, 1, '{"q1":"rahasia-b"}'::jsonb);
  set local role authenticated;
  select set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', user_a), true);
  select count(*) into count_tmp from public.responses
    where form_id = form_b_draft;
  if count_tmp <> 0 then
    raise exception '[GAGAL] user A dapat membaca respons form milik B';
  end if;

  raise notice 'SEMUA CHECK RLS LOLOS (9 ketentuan)';
end
$$;

rollback;
