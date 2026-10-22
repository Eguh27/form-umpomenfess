# Uji E2E Dummy (headless) — T-68 @R

- Reviewer: **R** (read-only; tidak mengubah kode aplikasi — hanya dokumen ini)
- Tanggal: 2026-10-22 · Branch: `main` · Commit dasar: `ccc5506`
- Dasar: TASK 6 (Fitur MVP) + TASK 9 WS-C/WS-R + bagian **agent** dari T-65
  ("uji end-to-end dummy"; bagian HP + teman tetap manusia)
- Metode: browser sungguhan (Playwright/Chromium headless) terhadap dev server
  lokal + **database Supabase nyata** project form ini, memakai user + form dummy
  (data dummy sudah dibersihkan ulang di akhir sesi — `forms/responses/reports/form_images` = 0 baris).
- Batasan: TURNSTILE memakai key **produksi** → challenge ditolak browser otomatis
  (`600010`, bot detection). Untuk menguji jalur submit penuh, jalur itu dijalankan
  di server uji kedua (port 4322) dengan **Turnstile test key** Cloudflare
  (sitekey `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`).

## Ringkasan verdict

| # | Temuan | Severity | Zona pemilik | Status |
|---|---|---|---|---|
| E1 | **Buat form / Duplikat gagal total** — `INSERT forms` tanpa `owner_id` → violate not-null. Tidak ada form yang bisa dibuat. | **TINGGI (blocker fungsional)** | @B (+ @A opsional) | ✅ **diperbaiki T-69** (owner_id dari sesi + pesan ramah; 5 test baru) |
| E2 | **Migrasi seed font belum dieksekusi** — 4 dari 5 template masih `Poppins`/`Inter` (di luar whitelist) → publish & autosave ditolak | **TINGGI (blocker, menunggu manusia)** | manusia/@A | ✅ **selesai 14:46–14:55** (@L update kolom `theme` via REST; @R melengkapi `schema.theme`) — ⚠️ berkas migrasi hanya update `templates.theme` → perlu dilengkapi @A |
| E3 | **`PUBLIC_SUPABASE_ANON_KEY` = `SUPABASE_SERVICE_ROLE_KEY`** — key service role bocor ke bundle client → RLS bisa dihancurkan total dari luar | **KRITIS (keamanan)** | manusia/@L | ⛔ terbuka |
| E4 | Turnstile otomatis ditolak di headless (`600010`) — perilaku normal bot-detection; perlu test key untuk E2E/CI | Rendah | @L/manusia | 📝 catatan |
| E5 | Halaman respons milik user lain → `302 /dashboard` (export.csv → `404`) — dua-duanya prosaik & aman, bentuknya beda | Info | @B/@C | 📝 catatan |
| E6 | Sesi browser bergantung pada cookie auth yang **terbaca JS** (`httpOnly:false`, default @supabase/ssr). Kalau cookie di-*httpOnly*-kan, seluruh tulis sisi klien (insert/publish/autosave) gagal diam-diam. | Rendah (latent) | @A/@B | 📝 catatan + cek golive |

> Urutan pengerjaan yang disarankan: **E3 → E2**, lalu ulangi E2E ini, baru
> menjalankan skrip `docs/uji-manual.md` (T-65) untuk bagian manusia/HP.
> (E1 sudah diperbaiki di T-69.)

---

## E1 — "Buat form" & "Duplikat" gagal total (`owner_id` NULL)

**Severity:** TINGGI (blocker) — **MVP tidak bisa dipakai: tidak ada satu pun form yang bisa dibuat.**

**Bukti (langsung di UI, server asli :4321):**

```
Klik "+ Buat form" → "Survei Skripsi"
→ POST https://<project>.supabase.co/rest/v1/forms?select=id,slug  → 400
→ alert di UI: null value in column "owner_id" of relation "forms" violates not-null constraint
```

Aksi yang terdampak (semuanya lewat fungsi yang sama `insertForm`):
- "Buat form → Form kosong" → gagal
- "Buat form → <template>" → gagal
- "Duplikat" → gagal (pesan error identik)

**Akar masalah:**
`src/components/builder/dashboardForms.ts` → `FormInsertPayload` (L59–68) **tidak
memuat `owner_id`**, lalu `insertForm()` (L127–154) melakukan
`supabase.from('forms').insert({ ...payload, slug })` tanpa `owner_id`.
Artinya: kolom `forms.owner_id` adalah `not null references auth.users(id)`
(`supabase/migrations/20261021122500_init_schema.sql` L21), dan policy
`forms_insert_own … with check (owner_id = auth.uid())`
(`supabase/migrations/20261021123000_rls_and_public_view.sql` L31–32) juga
menuntut nilainya.

**Dampak lanjutan:** even setelah E1 diperbaiki, template seed tetap tidak bisa
dipakai selama E2 belum beres (font di luar whitelist) — dua blocker menumpuk
di satu langkah pertama pengguna.

**Catatan positif:** jalur `form_images` (T-42 `POST /api/uploads/sign`) **sudah
benar** — menyertakan `owner_id: user.id` (`src/pages/api/uploads/sign.ts` L55–60).
Bug ini khusus insert `forms`.

**Remediasi:**
1. **@B (wajib):** sertakan `owner_id` saat insert, diambil dari sesi user
   (`getSupabaseBrowserClient().auth.getUser()` → `user.id`). Policy RLS yang ada
   otomatis memvalidasi nilainya, jadi tidak ada celah spoofing.
2. **@A (opsional, jaring pengaman):** trigger DB yang tidak bisa dipalsukan klien:
   ```sql
   create or replace function public.forms_set_owner() returns trigger
   language plpgsql as $$ begin
     if auth.uid() is not null then new.owner_id := auth.uid(); end if;
     return new;
   end $$;
   create trigger forms_owner_default before insert on public.forms
     for each row execute function public.forms_set_owner();
   ```
   Perhatikan guard `auth.uid() is not null`: skrip uji manusia
   (`tests/rls.sql`, `tests/submit_guard.sql`) insert dummy lewat service role
   (`auth.uid()` = null) dan harus tetap bisa jalan.
3. **UX (boleh @B):** jangan tampilkan pesan Postgres mentah ke pengguna
   (`error.message` apa adanya). Untuk kasus ini tulis pesan ramah, mis.
   "Gagal membuat form — coba lagi."

### Perbaikan E1 — T-69 (sudah dikerjakan, zona B)

Perubahan (commit terpisah, label zona B):
- `src/components/builder/dashboardForms.ts` — `insertForm()` mengambil
  `owner_id` dari **sesi** (`auth.getUser()`), bukan dari payload pemanggil
  (tak ada jalur pemalsuan pemilik; policy `forms_insert_own` tetap
  memvalidasi `owner_id = auth.uid()` di DB). `FormInsertPayload` sengaja
  tetap **tanpa** `owner_id` supaya tak bisa diisi nilai sembarangan.
- Galat Postgres mentah tak lagi tampil ke user: `friendlyError()` memetakan
  kode PostgREST (`42501/23503/23514/23505`) ke pesan ramah; detail teknis
  hanya ke `console.warn`.
- `closeForm()` / `deleteForm()` memakai pemetaan galat yang sama.
- `src/components/builder/dashboardForms.test.ts` — 5 test baru (fake client
  pola repo): `owner_id` ikut saat insert, retry slug 23505, galat → pesan
  ramah (bukan teks Postgres), sesi kosong → tak ada insert, batas form aktif
  → tak ada insert.

**Verifikasi ulang di browser (server asli :4321, DB nyata, user dummy):**
| Aksi | Sebelum | Sesudah |
|---|---|---|
| "Buat form → Form kosong" | 400 `owner_id` violates not-null | ✅ form tercipta (`owner_id` = user sesi, status draft), redirect ke builder |
| "Buat form → Survei Skripsi" | 400 (gagal total) | ✅ baris form tercipta (⚠️ masih terblokir E2: font seed) |
| "Duplikat" | 400 (gagal total) | ✅ duplikat tercipta, daftar dashboard 1 → 3 form |

Sisa: **E2** (migrasi seed font) masih memblokir *isi* form dari template —
baris form tercipta, tetapi editor menolak menyimpan/mempublish karena
`theme.font` di luar whitelist.

---

## E2 — Migrasi seed font belum dieksekusi (blocker, menunggu manusia)

**Severity:** TINGGI (blocker fungsional) — **"Buat dari template" tidak akan bisa dipakai**,
dan template lama tidak akan lolos publish.

**Bukti (isi DB saat ini):**

| Template | font di DB | Status whitelist |
|---|---|---|
| Survei Skripsi | `Poppins` | ❌ ditolak |
| Skala Likert 1-5 | `Inter` | ❌ ditolak |
| Undangan Responden Wawancara | `Poppins` | ❌ ditolak |
| Pendaftaran Responden Uji Coba | `Inter` | ❌ ditolak |
| Kuesioner Pendahuluan Skripsi | `Georgia` | ✅ valid |

Whitelist saat ini = `system-ui|Quicksand|Baloo 2|Georgia` (TASK 4.5, CONTRACT CHANGE
2026-10-22 @C). Gejalanya di builder (terbukti, setelah data font disamakan manual
pada form dummy):

```
Preview live  → "Menunggu draft yang valid untuk di-preview — perbaiki bab merah."
Publish       → "Tidak bisa publish — perbaiki masalah berikut dulu."
                 theme.font — Invalid option: expected one of "system-ui"|"Quicksand"|"Baloo 2"|"Georgia"
Status simpan → "Draft tak valid — TIDAK tersimpan"
```

**Artinya:** validator bekerja **benar** (menolak, bukan diam-diam memakai) — yang
belum beres adalah **migrasi** yang sudah tertulis di repo tapi belum dijalankan:
`supabase/migrations/20261022190000_seed_font_update.sql`.

**Remediasi (manusia, ~1 menit):**
1. Jalankan `20261022190000_seed_font_update.sql` di Supabase SQL Editor.
2. Jalankan `tests/seed_font_check.sql` → harus 0 baris font di luar whitelist.
3. (Sudah tercatat di `docs/golive-checklist.md` §2 butir 5 — hanya belum dieksekusi.)

**Status update (14:46–14:55) — ✅ tertutup, DENGAN satu gap berkas migrasi.**
@L mengeksekusi patch ekuivalen via REST (kolom `templates.theme` saja: Poppins→
Quicksand, Inter→system-ui). **Namun kolom itu bukan sumber kebenaran**: builder
memuat draft dari `templates.schema` (`stateFromRow` → `row.schema`), dan
validator memvalidasi `schema.theme`. Verifikasi saya setelah patch @L:

```
Survei Skripsi          theme: Quicksand   schema.theme: Poppins   → masih liar
Skala Likert 1-5        theme: system-ui   schema.theme: Inter     → masih liar
Undangan Responden…     theme: Quicksand   schema.theme: Poppins   → masih liar
Pendaftaran Responden…  theme: system-ui   schema.theme: Inter     → masih liar
Kuesioner Pendahuluan   theme: Georgia     schema.theme: Georgia   → OK
```

Penyebabnya: berkas `supabase/migrations/20261022190000_seed_font_update.sql`
**hanya** meng-update `templates.theme` + assertion-nya juga hanya memeriksa
kolom itu. Saya melengkapi dengan patch REST yang sama untuk `schema.theme`
(4 baris, idempoten), lalu verifikasi ulang:

```
semua 5 template: theme & schema.theme ∈ whitelist → 0 font liar
```

Bukti akhir di browser (user dummy, DB nyata): **"Buat form → Survei Skripsi"**
→ editor termuat tanpa issues, **preview live merender** ("Survei Skripsi: Judul
Aplikasi / Halo! Saya mahasiswa yang sedang menulis…"), dan **Publish berhasil**
("Form TERPUBLIKASI ✓ — bagikan tautan /f/form-htr5v").

**TINDAK BERKELANJUTAN (zona @A):** lengkapi berkas migrasi
`20261022190000_seed_font_update.sql` agar ikut memperbarui `schema.theme`
(jsonb_set pada `schema`→`{theme,font}`) dan assertion-nya memeriksa **kedua**
kolom. Kalau tidak, siapa pun yang menjalankan ulang migrasi di environment lain
akan meninggalkan template setengah diperbaiki (dan blokirnya tidak kasat mata — template
"terlihat" sudah Quicksand tapi tetap ditolak validator).

**Bonus (kosmetik, @D):** teks label masih "Kaca · Blush" (T-45) padahal tema
sudah diganti; diperbarui saat redesign T-67.

---

## E3 — `PUBLIC_SUPABASE_ANON_KEY` identik dengan `SUPABASE_SERVICE_ROLE_KEY` (KRITIS)

**Severity:** KRITIS (keamanan).

**Bukti 1 — kunci di `.env.local` sama persis:**

```
anon : prefix= eyJhbGciOiJIUz len= 219 sha= 54cb09fc200d
svc  : prefix= eyJhbGciOiJIUz len= 219 sha= 54cb09fc200d   → sama? true
```

**Bukti 2 — key bocor ke aset PUBLIK (hasil build):**

```
dist/client/_astro/jsx-runtime.BD3-ZvH3.js          ← aset yang diunduh browser
dist/server/.../browserClient_JHXmnW1S.mjs
.vercel/output/static/_astro/jsx-runtime.BD3-ZvH3.js
```

**Bukti 3 — dengan key itu, RLS dilewati total (cek via REST PostgREST):**

| Tabel | Status | Isi yang terbaca |
|---|---|---|
| `responses` | 200 | `id, form_id, form_version, …` (**jawaban responden**) |
| `forms` | 200 | `owner_id`, `slug`, `schema` |
| `reports` | 200 | `reason` dari pelapor |
| `templates` | 200 | schema template |

**Penjelasan penting — aplikasi sendiri masih benar.** Browser client memakai
**token sesi user** (Authorization, dari cookie sesi yang terbaca JS), sehingga
RLS tetap berlaku di dalam app: dashboard hanya menampilkan form milik sendiri,
export milik orang lain → `404`, respons milik orang lain → `302 /dashboard`.
Yang bocor adalah **kredensialnya sendiri**: siapa pun yang memuat halaman bisa
mengambil key tersebut dari bundle lalu mengabaikannya — termasuk menulis/menghapus
baris (TASK 4.4 melarang INSERT `responses` dari browser; dengan service role hal
itu jadi mungkin).

**Bukti tambahan (kenapa ini berbahaya, bukan sekadar "kebocoran tak gearing"):**
saat percobaan E2E pertama memakai cookie `httpOnly: true` (rig uji, bukan aplikasi),
browser client **tidak punya sesi** — namun semua tulis sisi klien tetap
"berhasil" (publish form, update versi) **karena** `apikey`-nya adalah service
role yang melewati RLS. Artinya aplikasi saat ini tampak normal **hanya karena**
kredensial bocor itu menutupi kemungkinan sesi yang hilang. begitu key diganti ke
anon yang benar, setiap jalur tulis sisi klien **wajib** punya sesi — kalau cookie
auth di-*httpOnly*-kan, tulisannya gagal diam-diam (lihat E6).

**Dampak bila build ini pernah di-deploy:** service role key publik = akses penuh
ke database project ini (baca/tulis/hapus `forms`, `responses`, `reports`,
`templates`; membaca jawaban responden secara massal).

**Remediasi (manusia/@L — PRIORITAS 1, sebelum deploy apa pun):**
1. Supabase → **Project Settings → API Keys** → salin key **anon/publishable yang
   asli** → taruh di `PUBLIC_SUPABASE_ANON_KEY` (`.env.local` **dan** Vercel
   Production + Preview).
2. **Rotasi `SUPABASE_SERVICE_ROLE_KEY`** (sudah bocor di artefak build) → update
   `.env.local`, Vercel, dan GitHub Secrets (workflow backup/cleanup).
3. Build ulang & deploy ulang; verifikasi bundle client tidak lagi memuat key.
4. **Guard anti-regresi:** tambahkan test/mingguan build yang gagal bila
   `PUBLIC_SUPABASE_ANON_KEY === SUPABASE_SERVICE_ROLE_KEY`, plus langkah
   "grep bundle client" di `docs/golive-checklist.md` §1 (kotak "tidak ada secret
   terselip" saat ini hanya menutupi repo, bukan artefak build).

---

## E4 — Turnstile di lingkungan otomatis (Rendah, catatan)

Widget Turnstile **berfungsi & sitekey sah**: iframe termuat, checkbox tampil
("Verifikasi bahwa Anda adalah manusia"), dan tidak muncul `110200
"Domain not authorized"` → hostname `localhost` sudah diizinkan.

Masalahnya: browser otomatis ditolak →
`Uncaught TurnstileError: [Cloudflare Turnstile] Error: 600010.` → token tetap
kosong → submit ditolak `captcha_belum_diisis`. `600***` = "generic challenge
failure / bot behavior detected" (dokumentasi Cloudflare) — **expected untuk
Playwright/Selenium**, bukan bug aplikasi.

Saran: pisahkan env untuk dev/CI dengan Turnstile **test key** (dokumentasi
Cloudflare: sitekey `1x00000000000000000000AA` = always pass, secret
`1x0000000000000000000000000000000AA` = always pass). Jalur submit **telah
diuji penuh & lulus** dengan test key (lihat checklist di bawah). Jangan pernah
menyalin production secret ke env preview/CI.

---

## E5 — Bentuk respons "bukan pemilik" berbeda antara dua halaman (Info)
- `GET /api/forms/<id>/export.csv` milik user lain → `404` + body
  `{"error":"form_tidak_tersedia"}` (prosaik ✅)
- `GET /dashboard/<id>/respons` milik user lain → `302 → /dashboard` (prosaik ✅)

Keduanya tidak membocorkan data. Hanya bentuknya beda — boleh diseragamkan
(opsional, @B/@C) atau dicatat di docs agar tak dianggap tak sengaja.

---

## E6 — Sesi sisi klien bergantung pada cookie auth yang terbaca JS (Rendah, latent)

`createBrowserClient` dari `@supabase/ssr` **selalu** menyimpan/membaca sesi
lewat cookie (`document.cookie`), bukan `localStorage`. Cookie auth yang
di-set server memakai `httpOnly: false` (default @supabase/ssr — juga tercatat
di `docs/review-security.md` S10) sehingga **terbaca JS**; inilah yang membuat
browser client punya sesi user.

Bukti: saat cookie di-set `httpOnly: true` (rig uji), `auth.getUser()` di browser
balas `Auth session missing!` → seluruh tulis sisi klien (insert form, publish,
autosave) gagal. Dengan `httpOnly: false` (perilaku aplikasi sebenarnya), sesi
terbaca dan RLS berlaku normal (terverifikasi pada fix E1: `owner_id` yang dikirim
diterima karena sama dengan `auth.uid()`).

**Risiko latent:** bila cookie auth di-*httpOnly*-kan (mis. demi "hardening"),
seluruh operasi tulis builder/dashboard berhenti **tanpa error yang jelas** di UI.
**Saran (dipilih saat E3 diperbaiki):** setelah mengganti key, verifikasi bahwa
tulis sisi klien masih jalan (buat form + publish di browser) — jangan hanya cek
bahwa halaman dashboard tampil. Tambahkan juga assertion/tes agar
`auth.getUser()` di browser mengembalikan user (bukan hanya halaman SSR yang benar).

---

## Yang LOLUS (bukti, bukan asumsi)

**Alur utama (browser sungguhan, DB nyata):**
1. Login sesi dummy → `/dashboard` **tidak** dialihkan ke `/login` ✅
2. Anonim `GET /dashboard` → `302 /login` ✅
3. Dashboard: "Buat form" membuka panel, **5 template seed terbaca** ✅ (tapi
   insert-nya gagal — lihat E1)
4. Builder: form terbaca, 5 blok dari template, status "Tersimpan", Undo/Redo
   terpasang, tab Properti/Tema, panel blok (naik/turun/hapus) ✅
5. Panel "Preview live" + toggle HP/Desktop + render heading/teks/pertanyaan ✅
6. Autosave hanya menyimpan payload valid (payload tak valid ditolak, TIDAK
   tersimpan) ✅
7. Publish → `status=published`, `version` 1→2, tombol berubah jadi
   "Publikasikan ulang", muncul tautan "Lihat form ↗" ✅
8. Halaman publik `/f/<slug>`: heading, teks, 3 pertanyaan, catatan privasi,
   tombol "Laporkan form", footer ✅
9. Widget Turnstile termuat & tampil ✅
10. Submit lewat UI → `303 /f/<slug>/terima-kasih` ("✦ TERCATAT — jawabanmu
    sudah tersimpan anonim") ✅
11. Baris `responses` tercipta (1 baris, `form_version=2`, `client_token` terisi) ✅
12. Halaman respons (pemilik): ringkasan per pertanyaan + persentase + tabel
    "Data mentah" ✅

**Endpoint (11 tes, `redirect: manual`):**

| # | Skenario | Hasil |
|---|---|---|
| T1 | submit tanpa token captcha | `303 ?err=captcha_belum_diisi` (fail-closed) ✅ |
| T2 | submit sah | `303 /terima-kasih`, baris +1 ✅ |
| T3 | `client_token` sama diulang | `303 /terima-kasih`, baris **tidak** bertambah ✅ |
| T4 | payload > 64 KB | `413 payload_besar` ✅ |
| T5 | 12 submit dalam semenit | 9× `?err=ratelimit` (batas 10/menit) ✅ |
| T6 | form masih `draft` | `303 ?err=tidak_tersedia` ✅ |
| T7 | `closes_at` sudah lewat | `303 ?err=sudah_tutup` ✅ |
| T8 | kuota tercapai (`max_responses`) | `303 ?err=penuh` ✅ |
| T9 | lapor form (anon) | `303 ?err=lapor_ok` + baris `reports` tercipta ✅ |
| T10 | `export.csv` pemilik | `200`, `content-type: text/csv; charset=utf-8`, `cache-control: no-store`, **BOM UTF-8 ada**, CRLF ✅ |
| T11 | anonim `/dashboard` | `302 /login` ✅ |
| T12 | `export.csv` form milik user lain (IDOR) | `404` prosaik ✅ |

**Keamanan konten (sesuai §9 skrip uji manual):**
13. XSS: jawaban `E2E <img src=x onerror=alert(1)>` → di halaman respons tampil
    sebagai **teks polos**, tidak ada dialog alert yang muncul ✅
14. CSV injection: jawaban `=HYPERLINK("http://evil.example")` → di CSV menjadi
    `"'=HYPERLINK(""http://evil.example"")"` (prefix `'`) ✅
15. Skema nakal: `theme.font` di luar whitelist → ditolak server-side dengan
    pesan jelas, **tidak** diam-diam dibersihkan ✅
16. Form tak ada → halaman "404-ISH — Form tidak tersedia" ( prosaik) ✅
17. Form `closed`/penuh → banner `sudah_tutup` / `penuh` ✅
18. Laporkan form → banner **HIJAU** `lapor_ok` (bukan merah galat) ✅
19. Dashboard memuat `cache-control: private, no-store` ✅
20. Dark/light toggle: `data-theme` berubah + tersimpan di `localStorage` ✅

**Aksi dashboard lain:** "Tutup" → `status=closed` ✅ · "Hapus" → `deleted_at`
terisi (soft delete) ✅ · form milik user lain **tidak** muncul di dashboard ✅

**Unit test & gate:** `npm test` → **145/145 lulus** ✅ (18 file) — tidak ada
regresi dari temuan di atas.

---

## Yang BELUM diuji (wajib dikerjakan manusia / lanjutan)

1. **Upload banner ke Cloudinary (T-42 live)** — sengaja tidak dijalankan: berkas
   akan masuk akun Cloudinary project ini (AGENTS.md §5: jangan menyentuh akun
   nyata saat test). Butuh koordinasi + eksekusi manusia.
2. **Login Google OAuth** — butuh akun Google manusia; E2E memakai user dummy
   via Supabase Admin API.
3. **HP nyata + teman (T-65 §10)** — masih manusia.
4. **CSP di build/preview** — CSP tidak aktif di `astro dev`; klaim "0 pelanggaran
   CSP" @D sudah diuji di build/preview, belum diulang di sini.
5. **Migrasi, backup/restore, cron cleanup** — sudah punya skrip sendiri
   (`docs/golive-checklist.md`, `docs/restore.md`).
6. **Deploy produksi** — belum ada; setelah E3 diperbaiki.

## Cara mengulang E2E ini (resep singkat)

1. Buat user dummy (Supabase Admin API) + Ambil cookie sesi lewat `@supabase/ssr`
   → `browserClient` memakai token sesi, RLS tetap aktif.
2. Untuk form: **perbaiki E1 dulu** (atau insert fixture via service role dengan
   `owner_id` = user dummy).
3. Jalankan dev server dengan **Turnstile test key** (port lain) agar jalur
   submit bisa diuji tanpa interaksi manusia.
4. Setelah submit: cek `responses` (1 baris), halaman respons, dan `export.csv`
   (BOM + guard injeksi).

---

*Dokumen ini read-only: @R tidak mengubah kode aplikasi. Perbaikan E1 (zona @B),
E2 (migrasi @A/manusia), E3 (manusia/@L) dicatat di TODO.md bagian Requests.*
