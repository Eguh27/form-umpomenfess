-- ============================================================================
-- 20261022174000_submit_guard.sql — T-64 bagian @A (temuan R1/R2 review-race).
--
-- 1) Kolom client_token + partial unique index → idempotensi KUAT:
--    insert dua kali dgn token sama (form sama) ditolak Postgres; endpoint
--    memperlakukannya sebagai SUKSES (redirect terima kasih, tanpa duplikat).
-- 2) RPC insert_response_guarded(): kuota dihitung SETELAH mengunci baris
--    form (SELECT ... FOR UPDATE) DALAM transaksi yang sama dgn insert →
--    tidak ada TOCTOU di batas max_responses.
--
-- WALIBA: jalankan manual manusia via Supabase SQL Editor (pola T-12).
-- Endpoint C otomatis fallback ke jalur lama (count → insert) bila rpc belum
-- ada (error 42883), jadi deploy aman sebelum/sesudah migrasi dipush.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) client_token (dari hidden input halaman; <64 char alnum-_-)
-- ---------------------------------------------------------------------------
alter table public.responses
  add column if not exists client_token text;

create unique index if not exists responses_form_client_token_unique
  on public.responses (form_id, client_token)
  where client_token is not null;

-- ---------------------------------------------------------------------------
-- 2) RPC penjaga kuota — dipanggil service role (bypass RLS).
--    Return kode: 'ok' | 'form_tidak_tersedia' | 'sudah_tutup' | 'penuh'
--               | 'duplikat' | 'payload' (answers null dibiarkan endpoint).
--    'duplikat' = token sudah pernah masuk → dianggap sukses replay.
-- ---------------------------------------------------------------------------
create or replace function public.insert_response_guarded(
  p_form_id    uuid,
  p_version    integer,
  p_answers    jsonb,
  p_client_token text default null,
  p_now        timestamptz default now()
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status        text;
  v_deleted_at    timestamptz;
  v_closes_at     timestamptz;
  v_max_responses integer;
  v_count         integer;
begin
  if p_answers is null or not jsonb_typeof(p_answers) = 'object' then
    return 'payload';
  end if;

  -- FAST-PATH replay (R2): token sudah pernah masuk → duplikat, TANPA cek
  -- kuota. Double-click setelah kuota tercapai tetap dianggap "sudah sukses".
  if p_client_token is not null and p_client_token <> '' then
    if exists (
      select 1 from public.responses
      where form_id = p_form_id and client_token = p_client_token
    ) then
      return 'duplikat';
    end if;
  end if;

  -- Kunci baris form utk seluruh transaksi (permintaan paralel antre di sini).
  select status, deleted_at, closes_at, max_responses
    into v_status, v_deleted_at, v_closes_at, v_max_responses
  from public.forms
  where id = p_form_id
  for update;

  if not found or v_status <> 'published' or v_deleted_at is not null then
    return 'form_tidak_tersedia';
  end if;

  if v_closes_at is not null and v_closes_at <= p_now then
    return 'sudah_tutup';
  end if;

  -- Kuota DI DALAM transaksi yang sama dgn insert → atomik terhadap race.
  select count(*) into v_count from public.responses where form_id = p_form_id;
  if v_max_responses is not null and v_count >= v_max_responses then
    return 'penuh';
  end if;

  -- client_token unik (sesama replikasi double-click):
  -- index partial menolak duplikat di luar jendela map in-memory sekalipun.
  begin
    insert into public.responses (form_id, form_version, answers, client_token)
    values (p_form_id, p_version, p_answers, p_client_token);
  exception when unique_violation then
    return 'duplikat';
  end;

  return 'ok';
end;
$$;

comment on function public.insert_response_guarded is
  'T-64 @A: insert respons terjaga kuota atomik (R1) + idempoten client_token (R2). Dipanggil service role dari /api/forms/[slug]/submit.';
