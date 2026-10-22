# Review Keamanan — T-62 @R

- Reviewer: R (read-only; tidak mengubah kode)
- Tanggal: 2026-10-22 · Commit ditinjau: `ae1c337`
- Basis: TASK 9 WS-R — bypass RLS, XSS lewat JSON, CSV injection, bocor secret,
  abuse upload, rate limit/Turnstile, race condition batas respons, IDOR
  (race dibedah terpisah di `docs/review-race-T63.md`).
- Metode: audit sumber (grep + baca file utuh), smoke curl dev localhost,
  library check (`@supabase/ssr` constants), verifikasi migrasi SQL. TIDAK ada
  penulisan kode di luar dokumen ini.

## Ringkasan verdict

| # | Temuan | Severity | Zona pemilik | Status |
|---|---|---|---|---|
| S1 | Widget Turnstile tanpa `<script api.js>` — form publik tak bisa dikirim | **Tinggi** (fungsional; keamanan tetap fail-closed) | @C | terbuka → T-64 |
| S2 | `publicIdPattern` mengizinkan publicId luar folder `form/` — gambar pemilik lain bisa dijadikan banner (cloud dibagikan) | Sedang | @C | terbuka → T-64 |
| S3 | Batas 64KB via header `content-length` saja — chunked tanpa header bisa lewat | Sedang | @C | terbuka → T-64 |
| S4 | Map rate-limit membesar tak terbatas per IP unik (memori) | Rendah | @C | terbuka → T-64 |
| S5 | `?err=lapor_ok` ditampilkan sebagai banner `role=alert` berwarna danger — pesan sukses tampak seperti gagal | Rendah | @C | terbuka → T-64 |
| S6 | Respons 303 redirect tanpa `cache-control: no-store` (konsistensi dgn export.csv) | Rendah | @C | terbuka → T-64 |
| S7 | Halaman terautentikasi (/dashboard) tanpa `Cache-Control: private, no-store` eksplisit | Rendah | @L/@B | terbuka → T-64 |
| S8 | CSP belum ada (script-src/connect-src/img-src belum diunci) | Rendah | @L/@D | terbuka → T-64 |
| S9 | `docs/google.json` (kredensial) masih untracked DI DALAM folder repo | Sedang | manusia/@L | gitignore menunggu @L; berkas mohon dipindah keluar |
| S10 | Cookie auth `httpOnly:false` (keharusan arsitektur browserClient B) — trade-off tercatat | Info | @A | catatan |
| S11 | Regex UUID halaman B (`[0-9a-f-]{36}`) lebih longgar dari punya C — seragamkan opsional | Info | @B | catatan |
| S12 | Teks `reports` diterima anon — jangan pernah di-render tanpa escape saat panel admin dibangun | Info | @C mas depan | catatan |

## Yang AMAN (tidak menemukan masalah) — bukti

1. **Bypass RLS**: RLS aktif di semua 5 tabel (`20261021123000` L17–21);
   `responses` TANPA INSERT/UPDATE/DELETE policy (hanya jalur service role);
   satu-satunya pintu baca anon = view `public_forms` (grant L103) yang
   menyembunyikan `owner_id/status/deleted_at/tier`; 9 ketentuan di
   `tests/rls.sql` (T-12, dieksekusi manusia — 9/9 lolos). Endpoint submit membaca
   HANYA via `public_forms` (bukan tabel forms) — draft tak terbaca dari jalur
   mana pun; export CSV & halaman respons lewat klien user milik `forms_select_own`.
2. **XSS lewat JSON/teks user**: tidak ada `set:html`/`dangerouslySetInnerHTML`
   /`innerHTML` di seluruh `src/` (satu-satunya grep nyata = komentar).
   Halaman publik & tabel respons memakai interpolasi Astro/React (auto-escape).
   Label/teks pemilik form disimpan mentah, di-escape saat render — sesuai aturan.
3. **CSV injection**: `csvCell` menandai awalan `=+-@tab\r` dengan `'`, kutip
   dobel, CRLF RFC 4180 + BOM; ada unit test vektor tetap (regresi aman).
4. **Bocor secret**: `CLOUDINARY_API_*` & `SUPABASE_SERVICE_ROLE_KEY` hanya di
   endpoint server (service.ts, uploads/sign.ts, submit.ts); tidak ada grep
   kecuali komentar env; islands hanya `PUBLIC_*`; `.env.local` tak ter-track;
   T-42 sign memakai SHA-1 param `folder/public_id/timestamp` — folder TIDAK
   bisa diubah klien (terikat tanda tangan).
5. **Abuse upload**: sesi wajib (401), `checkFile` di server (mime ≤2MB),
   publicId selalu folder `form/` hasil server, dicatat `form_images(state='tmp')`
   via klien user (RLS), cap tmp/owner 2×limit (429); manifest cleanup T-60 @D
   dijalankan menyusul — pasangan wajar.
6. **Rate limit/Turnstile**: submit & report berbagi jendela per IP (report
   lebih tegas 5/menit); Turnstile verifikasi server-side fail-closed: secret
   kosong → gagal, body `success:false` → ditolak, jaringan error → gagal
   (dites mock). Urutan cek: captcha SEBELUM query DB — jalur nakal murah.
7. **IDOR**: export.csv & halaman respons: id salah format → 404/redirect; id
   milik orang lain → RLS menyembunyikan baris → 404 prosaik ("form tidak
   tersedia") tanpa membocorkan keberadaan. Open-redirect tidak ada (Location
   hanya slug tervalidasi + kode err dari daftar tertutup).

## Catatan arsitektural (Info)

- `@supabase/ssr DEFAULT_COOKIE_OPTIONS`: `sameSite:"lax"` (POST lintas situs
  tak mengirim cookie → CSRF mitigasi bawaan), `httpOnly:false` wajib karena
  `browserClient.ts` membaca token di JS utk CRUD UNGGAH via client browser.
  Dengan nol permukaan XSS (butir 2), trade-off ini diterima; kunci penguatan =
  CSP (S8) di masa depan bila mau.
- Rate limit in-memory: benar per-instance; skala multi-instance akan menaikkan
  efektivitas limit; cukup utk MVP (lihat juga review-race).

## Rekomendasi prioritas untuk T-64

1. @C: tambahkan `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer>` (S1) — satu baris, plus smoke dengan sitekey.
2. @C: `publicIdPattern` → wajib awalan `form/` + test (S2).
3. @C: hitung total byte entri FormData pasca-parse; tolak > `LIMITS.maxSubmitPayloadBytes` (S3).
4. @C: batasi `hits` (mis. size > 10_000 → clear) (S4); pisahkan banner sukses/gagal (S5); no-store di redirect 303 (S6).
5. @L/@B: header cache privat utk /dashboard (S7); @L/@D: CSP dasar (S8).
6. Manusia: pindahkan `docs/google.json` keluar repo (S9).
