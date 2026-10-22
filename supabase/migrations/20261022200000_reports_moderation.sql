-- 20261022200000_reports_moderation.sql
-- Epic B: Kolom moderasi untuk tabel reports (status, resolved_at, resolved_by, action_taken, notes)

alter table public.reports
  add column if not exists status text not null default 'pending',
  add column if not exists resolved_at timestamptz null,
  add column if not exists resolved_by uuid null references auth.users (id) on delete set null,
  add column if not exists action_taken text null,
  add column if not exists notes text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_status_check'
  ) then
    alter table public.reports
      add constraint reports_status_check check (status in ('pending', 'resolved', 'dismissed'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_action_check'
  ) then
    alter table public.reports
      add constraint reports_action_check check (action_taken in ('form_closed', 'dismissed', 'resolved'));
  end if;
end $$;

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
