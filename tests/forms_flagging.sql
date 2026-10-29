-- ============================================================================
-- tests/forms_flagging.sql — Uji verifikasi trigger flagging form saat dilaporkan (T-85)
-- Eksekusi di Supabase SQL Editor. Transaksi selalu di-ROLLBACK (tanpa efek samping).
-- ============================================================================

begin;

do $$
declare
  v_form_id uuid;
  v_report_id uuid;
  v_flagged boolean;
  v_count integer;
  v_time timestamptz;
begin
  -- 1. Buat form dummy
  insert into public.forms (title, slug, status, schema, theme)
  values ('Form Flagging Test', 'test-form-flag-1', 'published', '{"schemaVersion":1,"blocks":[]}', '{}')
  returning id into v_form_id;

  -- 2. Verifikasi state awal: belum diflag dan count 0
  select is_flagged, report_count, last_flagged_at
  into v_flagged, v_count, v_time
  from public.forms
  where id = v_form_id;

  assert v_flagged = false, 'FAIL: is_flagged awal harus false';
  assert v_count = 0, 'FAIL: report_count awal harus 0';
  assert v_time is null, 'FAIL: last_flagged_at awal harus null';

  -- 3. Responden mengirim laporan pertama
  insert into public.reports (form_id, reason)
  values (v_form_id, 'Form meminta data sensitif NIK')
  returning id into v_report_id;

  -- 4. Verifikasi trigger otomatis menandai form
  select is_flagged, report_count, last_flagged_at
  into v_flagged, v_count, v_time
  from public.forms
  where id = v_form_id;

  assert v_flagged = true, 'FAIL: trigger harus mengubah is_flagged menjadi true';
  assert v_count = 1, 'FAIL: trigger harus menambah report_count menjadi 1';
  assert v_time is not null, 'FAIL: trigger harus mengisi last_flagged_at';

  -- 5. Responden kedua mengirim laporan lain
  insert into public.reports (form_id, reason)
  values (v_form_id, 'Phishing kata sandi bank');

  select is_flagged, report_count
  into v_flagged, v_count
  from public.forms
  where id = v_form_id;

  assert v_flagged = true, 'FAIL: is_flagged harus tetap true';
  assert v_count = 2, 'FAIL: report_count harus bertambah menjadi 2';

  raise notice 'SUCCESS: Trigger handle_report_flag_form lulus uji verifikasi.';
end $$;

rollback;
