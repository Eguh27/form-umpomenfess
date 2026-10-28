-- ============================================================================
-- FIX KRITIS: public_forms read-only + RLS SELECT publik (T-81, @L)
-- ============================================================================
-- Temuan uji live 2026-10-28:
--  1. Di produksi view public_forms ber-reloption security_invoker=on (hardening
--     manual). Karena forms hanya punya policy SELECT untuk owner, anon melihat
--     0 baris -> SEMUA /f/<slug> menjawab "Form tidak tersedia".
--  2. Sebaliknya, security_invoker=off mengeksekusi view sebagai postgres:
--     RLS dilewati DAN view auto-updatable -> anon bisa UPDATE/DELETE forms
--     lewat view (dibuktikan dalam transaksi rollback).
--
-- Perbaikan: security_invoker=on + policy SELECT published untuk anon + grant
-- kolom minimum + cabut seluruh hak tulis pada view.
--
-- CATATAN authenticated: halaman publik & laporan memakai klien anon tanpa
-- cookie sesi (createAnonClient), jadi TIDAK ada policy published untuk
-- authenticated. Kalau diberi policy itu, user login bisa membaca owner_id/
-- tier semua form published lewat tabel forms (kebocoran data internal).
-- ============================================================================

alter view public.public_forms set (security_invoker = true);

drop policy if exists "forms_select_published_anon" on public.forms;
create policy "forms_select_published_anon" on public.forms
  for select to anon
  using (status = 'published' and deleted_at is null);

-- Pastikan policy lama tidak tertinggal di DB yang pernah menerima versi awal.
drop policy if exists "forms_select_published_authenticated" on public.forms;

-- Anon hanya butuh kolom yang diekspos view. Jangan beri SELECT tabel penuh:
-- owner_id, tier, dan kolom internal lain tidak untuk publik.
revoke select on public.forms from anon;
grant select (
  id,
  slug,
  title,
  schema,
  schema_version,
  version,
  closes_at,
  max_responses,
  created_at,
  updated_at,
  banner_data_url,
  archived_at,
  status,
  deleted_at
) on public.forms to anon;

-- Anon tidak pernah menulis forms langsung.
revoke insert, update, delete, truncate, references, trigger
  on public.forms from anon;

-- View hanya jalur baca. Supabase memberi default grant ALL pada objek baru;
-- cabut hak tulis agar view tidak bisa dipakai sebagai pintu UPDATE/DELETE.
revoke insert, update, delete, truncate, references, trigger
  on public.public_forms from anon, authenticated;
grant select on public.public_forms to anon, authenticated;

comment on view public.public_forms is
  'Baca publik read-only; security_invoker=on + RLS policy published untuk anon. Jangan set security_invoker=off (view auto-updatable, bypass RLS).';

notify pgrst, 'reload schema';
