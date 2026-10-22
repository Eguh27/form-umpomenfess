-- ============================================================================
-- tests/reports_moderation.sql — Uji verifikasi kolom & constraint moderasi reports
-- Eksekusi di Supabase SQL Editor. Transaksi selalu di-ROLLBACK (tanpa efek samping).
-- ============================================================================

begin;

-- 1. Verifikasi kolom baru dapat diisi
do $$
declare
  v_form_id uuid;
  v_report_id uuid;
begin
  -- Buat form dummy
  insert into public.forms (title, slug, status, schema, theme)
  values ('Form Moderasi Test', 'test-form-mod-1', 'published', '{"schemaVersion":1,"blocks":[]}', '{}')
  returning id into v_form_id;

  -- Insert report dengan status default ('pending')
  insert into public.reports (form_id, reason)
  values (v_form_id, 'Uji coba laporan spam')
  returning id into v_report_id;

  -- Verifikasi default status adalah pending
  assert (select status from public.reports where id = v_report_id) = 'pending',
    'FAIL: default status harus pending';

  -- Update report ke resolved
  update public.reports
  set status = 'resolved',
      action_taken = 'resolved',
      resolved_at = now(),
      notes = 'Sudah ditinjau'
  where id = v_report_id;

  assert (select status from public.reports where id = v_report_id) = 'resolved',
    'FAIL: status harus resolved setelah update';

  -- Pastikan status invalid ditolak
  begin
    update public.reports set status = 'invalid_status' where id = v_report_id;
    raise exception 'FAIL: status check constraint gagal menolak nilai asing';
  exception when check_violation then
    -- Sukses ditolak
    null;
  end;

  raise notice 'SUCCESS: Seluruh assertion moderasi reports lulus.';
end $$;

rollback;
