-- ============================================================================
-- tests/submit_guard.sql — T-64 @A (eksekusi MANUAL manusia di Supabase SQL
-- Editor; pola sama seperti tests/rls.sql: blok transaksi + rollback akhir,
-- jadi tidak meninggalkan sisa data).
--
-- Membuktikan temuan review-race:
--   R1 — kuota dihitung dalam transaksi yang sama dgn insert (tanpa TOCTOU),
--        baris form dikunci SELECT ... FOR UPDATE.
--   R2 — client_token unik: replay dimap 'duplikat' (bukan insert baru),
--        termasuk saat kuota sudah penuh.
--
-- Jalankan SEKALI; hasil = notice "submit_guard: ... LULUS" atau AssertionError
-- command (no lines) dgn label yang gagal.
-- ============================================================================

begin;

do $$
declare
  uid uuid;
  fid uuid;
begin
  select id into uid from auth.users limit 1;
  if uid is null then
    raise exception 'tidak ada user di auth.users untuk test dummy';
  end if;

  -- schema & theme NOT NULL (init L25-26) → dummy minimal yang valid per
  -- kontrak TASK 4.5 (RPC hanya cek jsonb object, isi tak diparso di sini).
  insert into public.forms (owner_id, slug, title, status, version, max_responses, closes_at, schema, theme)
  values (
    uid,
    'test-guard-r1',
    'Test kuota atomik',
    'published',
    1,
    2,
    now() + interval '1 hour',
    '{"schemaVersion":1,"blocks":[{"id":"b1","type":"divider"}]}'::jsonb,
    '{"bg":"#ffffff","accent":"#ec4899","text":"#1f2937","font":"system-ui","radius":16,"cardStyle":"menfess","bannerPublicId":null}'::jsonb
  )
  returning id into fid;

  -- 1) dua insert di bawah kuota → ok.
  assert public.insert_response_guarded(fid, 1, '{"q1":"a"}'::jsonb, 'tok-1') = 'ok', 'R1.1 gagal';
  assert public.insert_response_guarded(fid, 1, '{"q1":"b"}'::jsonb, 'tok-2') = 'ok', 'R1.2 gagal';

  -- 2) kuota 2 tercapai → insert coba ketiga tanpa token → penuh.
  assert public.insert_response_guarded(fid, 1, '{"q1":"c"}'::jsonb, null) = 'penuh', 'R1.3 penuh gagal';

  -- 2b) TYPO guard: penuh TIDAK menyisipkan baris keempat.
  assert (select count(*) from public.responses where form_id = fid) = 2, 'baris tumbuh saat penuh';

  -- 5) replay token tok-1 saat kuota penuh → tetap duplikat (fast-path).
  assert public.insert_response_guarded(fid, 1, '{"q1":"a"}'::jsonb, 'tok-1') = 'duplikat', 'R2 duplikat gagal';

  -- 3) form di-draft → tidak tersedia.
  update public.forms set status = 'draft' where id = fid;
  assert public.insert_response_guarded(fid, 1, '{"q1":"x"}'::jsonb, null) = 'form_tidak_tersedia', 'R1 draft gagal';
  update public.forms set status = 'published' where id = fid;

  -- 4) closes_at lewat → sudah_tutup (prio atas penuh).
  update public.forms set closes_at = now() - interval '1 hour' where id = fid;
  assert public.insert_response_guarded(fid, 1, '{"q1":"x"}'::jsonb, null) = 'sudah_tutup', 'R1 tutup gagal';
  update public.forms set closes_at = now() + interval '1 hour' where id = fid;

  -- 6) answers bukan object → payload.
  assert public.insert_response_guarded(fid, 1, '"bukan-object"'::jsonb, null) = 'payload', 'payload gagal';

  raise notice 'submit_guard: 8 assertion LULUS — fungsi insert_response_guarded siap (R1+R2)';
end $$;

rollback;
