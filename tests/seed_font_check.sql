-- ============================================================================
-- tests/seed_font_check.sql — T-64 sisa @A (menutup janji "test seed permanen"
-- di TODO Requests). Eksekusi MANUAL manusia di Supabase SQL Editor.
--
-- Harapan: query pertama = 0 baris (semua font template aman whitelist),
-- query kedua = daftar template dgn font terpakai (kontrol mata manusia).
-- ============================================================================

-- 1) Hukum: tak boleh ada font off-whitelist di template.
select id, name, theme ->> 'font' as font
from public.templates
where theme ->> 'font' not in ('system-ui', 'Quicksand', 'Baloo 2', 'Georgia')
   or theme ->> 'font' is null;

-- 2) Kontrol: distribution font yang terpasang.
select theme ->> 'font' as font, count(*) as jumlah
from public.templates
group by 1
order by 2 desc;
