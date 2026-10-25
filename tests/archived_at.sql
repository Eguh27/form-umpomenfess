-- ============================================================================
-- Test E-A5: archived_at column & public_forms view
-- Menjalankan verifikasi skema dalam transaksi yang di-rollback.
-- ============================================================================
begin;

-- 1. Verifikasi kolom ada pada tabel forms
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'forms'
      and column_name = 'archived_at'
  ) then
    raise exception 'Assertion gagal: forms.archived_at tidak ditemukan';
  end if;
end $$;

-- 2. Verifikasi kolom terekspos pada view public_forms
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_forms'
      and column_name = 'archived_at'
  ) then
    raise exception 'Assertion gagal: public_forms.archived_at tidak ditemukan';
  end if;
end $$;

-- 3. Verifikasi index parsial aktif
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'forms'
      and indexname = 'idx_forms_archived_at'
  ) then
    raise exception 'Assertion gagal: index idx_forms_archived_at tidak ditemukan';
  end if;
end $$;

rollback;
