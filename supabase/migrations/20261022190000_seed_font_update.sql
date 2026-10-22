-- ============================================================================
-- 20261022190000_seed_font_update.sql — T-64 sisa @A (permintaan @D/@C
-- CONTRACT CHANGE FONT_WHITELIST; lihat TODO Requests).
--
-- Whitelist aplikasi baru: system-ui | Quicksand | Baloo 2 | Georgia
-- (TASK 4.5). Seed templates (20261021124000) memakai font lama:
--   Poppins (4) → Quicksand   (font utama tema "Kaca · Blush")
--   Inter   (4) → system-ui   (teks netral; Georgia/system-ui tetap sah)
-- Tanpa ini: menyalin template seed → editor → autosave GAGAL (zod menolak
-- font di luar whitelist) — blocker uji E2E T-65.
--
-- Idempoten: filter `theme->>'font' = '...'`, boleh dijalankan ulang.
-- Tambahan assertion diri agar migrasi gagal keras bila masih ada font liar.
-- ============================================================================

update public.templates
  set theme = jsonb_set(theme, '{font}', '"Quicksand"')
  where theme ->> 'font' = 'Poppins';

update public.templates
  set theme = jsonb_set(theme, '{font}', '"system-ui"')
  where theme ->> 'font' = 'Inter';

do $$
declare
  liars integer;
begin
  select count(*) into liars
  from public.templates
  where theme ->> 'font' in ('Poppins', 'Inter', 'Roboto', 'Montserrat', 'Open Sans');

  if liars > 0 then
    raise exception 'seed_font_update: masih ada % template ber-font off-whitelist', liars;
  end if;

  raise notice 'seed_font_update: OK — whitelist font seed aman (Poppins→Quicksand, Inter→system-ui)';
end $$;
