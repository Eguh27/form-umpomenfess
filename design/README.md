# Design system — umpomenfess form

Sumber nilai: **template "Kaca · Blush"** (SVG referensi dari manusia) + situs utama
umpomenfess.my.id. File token: [`tokens.css`](./tokens.css) — semua halaman wajib
memakai token ini, bukan warna/nomor mentah.

## Sekilah

| Token | Light | Dark | Catatan |
|---|---|---|---|
| `--bg` | `#FDEEEC` (kbg blush) | `#16201E` | latar halaman |
| `--blob-1..3` | `#E8604C@.30`, `#F6A678@.34`, `#F6C96B@.45` | alpha diturunkan | radial via `.bg-blobs` |
| `--surface` / `--surface-glass` / `--surface-soft` | putih / `rgba(255,255,255,.62)` / `.45` | versi gelap | kartu plain / menfess / soft |
| `--text` / `--text-muted` | `#1F4D46` / `#4F6A62` | `#F3EFE6` / `#9DB5AD` | muted light **digelapkan dari #7C958D** agar ≥4.5:1 |
| `--brand` / `--on-brand` | `#2F7263` / `#FFF6EA` | sama | tombol (interaktif, lolos 4.5:1) |
| `--pill-bg` / `--on-pill` | `#4A9A8B` / `#FFF6EA` | dim | pill *dekoratif* — digeser sejengkal dari `#4C9E8F` (referensi) agar teks pill ≥3:1 |
| `--accent` | `#E8604C` | sama | logo/hover/aktif (aksen terang sebagai teks hanya di dark) |
| `--border` / `--border-glass` | `rgba(31,77,70,.12)` / `rgba(255,255,255,.95)` | putih tipis | kartu biasa / kartu kaca |
| `--radius-lg` = 32px | | | kartu kaca (rx 32 di referensi) |
| `--shadow` | `0 24px 52px rgba(31,77,70,.12)` | hitam | untuk kartu kaca |

Tipografi: **Quicksand** 500/600/700 (isi) + **Baloo 2** 700 (brand/judul) — dimuat
via Google Fonts di `Base.astro`.

## Dark mode

Pola identik situs utama:
1. Script pre-hydration inline di `Base.astro` menulis
   `documentElement.dataset.theme` (localStorage `theme` → fallback
   `prefers-color-scheme`).
2. CSS hanya mengenal `[data-theme="dark"]`; tidak ada `@media` warna.
3. `meta theme-color` dua-duanya (light/dark) via `media=`.

Komponen UI tidak boleh menulis warna sendiri — selalu dari token — sehingga
mengganti tema otomatis mengikuti.

## Komponen (`src/styles/global.css`)

- `.bg-blobs` + `.grain` — latar dekoratif (fixed, `z-index:-1`, aria-hidden).
- `.brand` (+ `__mark` `__name` `__sub`) — identitas header/kartu.
- `.site-header` (sticky, glass), `.site-nav`, `.site-footer` (garis dashed).
- `.btn` (+ `.btn--ghost`, `.btn--accent`) — pill 999px, focus ring terlihat.
- `.card` + preset **`card--menfess` / `card--plain` / `card--soft`** (T-32; juga
  bisa via `data-card="…"`, nilainya sama dengan `cardStyle` di schema JSON).
- `.mc-head` / `.mc-foot` — head/footer kartu gaya post menfess (logo+pill, kode).
- `.field` / `.input` / `.textarea` / `.select` / `.help` — dasar form.
- `.grid--2`, `.eyebrow`, `.pill`, `.dashed-divider` — util.

Mobile-first: satu kolom bertumpuk, `@media (min-width: 720px)` untuk 2 kolom.

## Aturan kontras (T-32)

Util: `src/lib/design/contrast.ts` — `contrastRatio`, `isReadable`,
`bestTextColor` (WCAG: ≥4.5 normal, ≥3 teks besar). Dipakai untuk:

1. Menjaga token di `tokens.css` tetap lolos (test `contrast.test.ts`).
2. Nanti oleh `@C` di validator tema: warna teks/latar pilihan pembuat form yang
   gagal `isReadable()` ditolak.

Catatan: pill `#4A9A8B`→`#FFF6EA` minta 3:1 saja karena *dekoratif kecil*
(pola template, dikencangkan dari #4C9E8F agar lolos); tombol interaktif wajib
4.5:1 — itulah kenapa `--brand` (#4C9E8F di referensi) jadi #2F7263.

## Kontrak & penanganan

- Whitelist font & preset kartu diatur di `src/lib/forms/schema.ts` (zona @C).
  Saat ini whitelist belum memuat **Quicksand / Baloo 2** — sudah dicatat sebagai
  Request di TODO.md (CONTRACT CHANGE akan diarahkan ke TASK 4.5).
- Jangan pakai warna/font di luar token; butuh nilai baru → edit `tokens.css`
  dulu, lalu masukkan ekstennya lewat test kontras bila terkait teks.
