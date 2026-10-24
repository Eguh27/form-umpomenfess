# Design system — umpomenfess form

Arah: **Kaca Blush Studio** — studio alat tulis berbahan kaca. Palet diambil
dari template **Kaca · Blush**, bukan dari langit/gunung situs utama. Situs ini
sengaja terasa selaras dengan umpomenfess, tetapi tidak meniru hero atau
komposisinya.

File token: [`tokens.css`](./tokens.css). Semua halaman memakai token ini;
jangan menulis warna atau ukuran font mentah di komponen.

## Palet

| Token | Light | Dark | Dipakai untuk |
|---|---|---|---|
| `--bg` | `#FDEEEC` blush | `#131C1A` | latar halaman |
| `--surface` | `#FFF9F4` kertas | `#1C2724` | kartu, input |
| `--surface-soft` | `#FBE9E4` | `#202C29` | bidang lembut, footer |
| `--surface-glass` | `rgba(255,255,255,.62)` | `rgba(28,39,36,.68)` | kartu kaca |
| `--text` / `--text-muted` | `#1F4D46` / `#4F6A62` | `#F3EFE6` / `#A9BDB5` | teks utama & sekunder |
| `--brand` / `--on-brand` | `#2F7263` / `#FFF6EA` | `#7FD0BE` / `#10201C` | CTA hijau, pill |
| `--accent` / `--accent-strong` | `#B8422E` | `#F08A73` | teks aksen & tombol coral |
| `--coral` | `#E8604C` | `#F07A63` | dekorasi, logo tile |
| `--peach` / `--gold` | `#F6A678` / `#F6C96B` | sama | blob & washi tape |
| `--pill-bg` / `--on-pill` | `#2F7263` / `#FFF6EA` | `#2A3B37` / `#F3EFE6` | badge kecil |

Coral dekoratif `#E8604C` tidak dipakai sebagai latar teks normal: kontras
krem di atasnya hanya 3.16:1. Tombol memakai `--accent-strong` `#B8422E`
(5.09:1) atau `--brand` `#2F7263` (5.29:1).

Bentuk: kartu **22px**, input/tombol **12–18px**, pill **999px**. Bayangan
`--shadow` 24/60 dan `--shadow-sm` 10/24. Tidak ada grain; tekstur datang dari
titik kanvas dan garis putus-putus.

Tipografi:

- **Baloo 2** 500/600/700 — judul, brand, tombol.
- **Quicksand** 400–700 — isi & UI.
- **Space Mono** 700 — kode/URL di mockup.

## Navbar & tombol referensi

Navbar mengikuti pola referensi: bar kaca mengambang `fixed`, logo tile coral
miring, link 13px tebal, CTA hijau gelap, dan menu mobile `<details>` tanpa
JS inline. Tombol: tinggi minimum 54px, radius 18px, hover naik 2px, primary
coral, secondary outline hijau. Warna coral diturunkan ke `#B8422E` agar
teks tombol tetap lolos WCAG.

## Dark mode

1. `src/styles/theme-init.js` (eksternal, dimuat blocking di `<head>`) menulis
   `documentElement.dataset.theme` sebelum render. Sumber: localStorage `theme`,
   fallback `prefers-color-scheme`.
2. `src/styles/theme-toggle.js` mengurus tombol header: simpan pilihan,
   perbarui `aria-pressed`/`aria-label`, dan ikut perubahan sistem bila pengguna
   belum memilih.
3. CSS hanya memakai `[data-theme="dark"]`; meta `theme-color` diperbarui oleh
   kedua script (`#FDEEEC` / `#131C1A`).

## Struktur stylesheet

- `src/styles/global.css` — reset, tipografi, kanvas blob + titik, header
  mengambang, menu mobile, footer blush, skip-link.
- `src/styles/components.css` — tombol, kartu preset, input, pill, login.
- `src/styles/landing.css` — hero studio, lembar alur kerja, tema, use case,
  CTA penutup.
- `src/styles/showcase.css` — mockup form sheet, washi tape, chip mengambang,
  preview tiga tema.
- `src/styles/theme-init.js`, `theme-toggle.js`, `nav-menu.js` — perilaku,
  bukan styling.

## Komponen

- `.site-header` fixed glass; `.brand` (tile form + wordmark + label `form`);
  `.site-nav`; `.nav-cta`; `.theme-toggle`; `.nav-mobile` + `.mobile-menu`.
- `.btn` (coral), `.btn--brand` (hijau), `.btn--ghost` (outline hijau).
- `.card` + preset **`card--menfess` / `card--plain` / `card--soft`**
  (T-32; juga `data-card="…"`, nilainya sama dengan `cardStyle` schema JSON).
- `.field` / `.input` / `.textarea` / `.select` / `.help` — dasar form.
- `.eyebrow`, `.pill`, `.dashed-divider`, `.grid--2` — util.

Mobile-first: hero satu kolom di bawah 900px; navbar menyembunyikan link
desktop dan menampilkan menu `<details>`.

## Kontras (T-32)

Util: `src/lib/design/contrast.ts` — `contrastRatio`, `isReadable`,
`bestTextColor` (WCAG: ≥4.5 teks normal, ≥3 teks besar). Dipakai oleh:

1. Test token `src/lib/design/contrast.test.ts` (light & dark).
2. `ThemePanel`/validator untuk menolak kombinasi tema form yang tidak terbaca.

Pasangan utama: ink/blush 8.43, muted/blush 5.21, cream/teal 5.29,
cream/deep coral 5.09, coral-ink/blush 4.83, dark text/dark bg 15.14,
dark accent/dark bg 7.11.
