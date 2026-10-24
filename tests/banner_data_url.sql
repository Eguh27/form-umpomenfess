-- ============================================================================
-- tests/banner_data_url.sql — uji CHECK & view kolom forms.banner_data_url
-- Jalankan di Supabase SQL Editor / psql SETELAH migrasi 20261024213000.
-- Transaksi selalu ROLLBACK (tidak meninggalkan data).
-- Butuh minimal satu baris auth.users sebagai owner form.
-- ============================================================================

begin;

do $$
declare
  v_owner uuid;
  v_form uuid;
  v_valid text := 'data:image/webp;base64,' || encode(convert_to('banner-test', 'UTF8'), 'base64');
begin
  select id into v_owner from auth.users order by created_at limit 1;
  if v_owner is null then
    raise notice 'SKIP: belum ada auth.users untuk owner test';
    return;
  end if;

  insert into public.forms (owner_id, slug, title, status, schema, theme)
  values (
    v_owner,
    'banner-test-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    'Banner Test',
    'draft',
    '{"schemaVersion":1,"theme":{},"blocks":[]}'::jsonb,
    '{}'::jsonb
  )
  returning id into v_form;

  -- 1) Data URL valid diterima
  update public.forms set banner_data_url = v_valid where id = v_form;

  -- 2) URL http biasa ditolak
  begin
    update public.forms set banner_data_url = 'https://example.test/banner.webp' where id = v_form;
    raise exception 'URL non-data seharusnya ditolak';
  exception when check_violation then null;
  end;

  -- 3) SVG ditolak
  begin
    update public.forms
    set banner_data_url = 'data:image/svg+xml;base64,' || encode(convert_to('<svg/>', 'UTF8'), 'base64')
    where id = v_form;
    raise exception 'SVG seharusnya ditolak';
  exception when check_violation then null;
  end;

  -- 4) Base64 melebihi batas panjang ditolak
  begin
    update public.forms
    set banner_data_url = 'data:image/webp;base64,' || repeat('A', 350000)
    where id = v_form;
    raise exception 'Melebihi batas panjang seharusnya ditolak';
  exception when check_violation then null;
  end;

  -- 5) View publik mengekspos banner untuk form published
  update public.forms set status = 'published', banner_data_url = v_valid where id = v_form;
  assert (select banner_data_url from public.public_forms where id = v_form) = v_valid,
    'public_forms harus mengekspos banner_data_url';

  raise notice 'OK: banner_data_url valid diterima; URL/SVG/oversize ditolak; view publik OK';
end $$;

rollback;
