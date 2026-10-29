-- 20261029110000_forms_flagging.sql
-- T-85: Flagging otomatis pada tabel forms saat laporan responden masuk
-- Mengubah moderasi admin menjadi form-centric (berbasis formulir bermasalah).

-- 1. Tambah kolom flag pada tabel forms
alter table public.forms
  add column if not exists is_flagged boolean not null default false,
  add column if not exists report_count integer not null default 0,
  add column if not exists last_flagged_at timestamptz null;

-- 2. Index untuk pencarian cepat form ter-flag di panel admin
create index if not exists forms_flagged_idx
  on public.forms (is_flagged, last_flagged_at desc)
  where is_flagged = true;

-- 3. Trigger function otomatis (SECURITY DEFINER agar aman dari role anon)
create or replace function public.handle_report_flag_form()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.forms
  set is_flagged = true,
      report_count = coalesce(report_count, 0) + 1,
      last_flagged_at = coalesce(NEW.created_at, now())
  where id = NEW.form_id;

  return NEW;
end;
$$;

-- 4. Pasang trigger pada tabel reports
drop trigger if exists on_report_flag_form on public.reports;
create trigger on_report_flag_form
  after insert on public.reports
  for each row
  execute function public.handle_report_flag_form();

comment on function public.handle_report_flag_form() is
  'Otomatis menandai forms.is_flagged = true dan menambah report_count saat ada laporan masuk ke public.reports.';
