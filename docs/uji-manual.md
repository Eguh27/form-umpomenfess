# Skrip Uji Manual — T-65 @L

- Pembuat: L · 2026-10-22. Eksekusi: **manusia** (tugasnya L adalah menyiapkan
  skrip ini; jalankan berurutan). Bukti: centang `✓` di tiap langkah + catat
  anomali di bagian Kwitansi.
- Pra-kebutuhan: `.env.local` lengkap + migrasi sudah dijalankan (lihat §2
  `docs/golive-checklist.md`) — terutama `seed_font_update` & `submit_guard`.
- Aturan: lulus di DESKTOP dulu, lalu ulang §10 di HP nyata dgn 2–3 teman.

## 1. Login & dashboard
- [ ] `/login` → masuk via Google → kembali ke `/dashboard` (daftar form +
  tombol buat)
- [ ] Anonim buka `/dashboard` → dialihkan ke `/login`
- [ ] Respons halaman bawa header `cache-control: private, no-store`
  (DevTools → Network)

## 2. Buat form — kosong & template
- [ ] "Buat baru" → form muncul di daftar dengan slug otomatis
- [ ] Salin salah satu template (dari 5) → **autosave lulus** (font seed sudah
  dalam whitelist); badge "Tersimpan" muncul sesuai debounce
- [ ] Tautan `Respons` tampil di breadcrumb builder

## 3. Isi form di builder
- [ ] Tambah heading/divider/pertanyaan tiap jenis (short, paragraph, single,
  multiple, dropdown, scale 1–5) → preview mengikuti
- [ ] Toggle wajib, maxLength, min/max scale; undo/redo; pindah urutan blok
- [ ] Batas: tambahkan blok sampai tibatas `LIMITS` → pesan batas ramah

## 4. Banner (upload Cloudinary — uji live penuh T-42)
- [ ] Upload JPG/PNG ≤ 2MB → preview banner muncul, autosave sukses
- [ ] Upload > 2MB / file ≠ gambar → ditolak dengan pesan yang jelas
- [ ] Cap eksak (E-A1): lewat Editor (banner, kirim formId) unggah gambar ke-6 → 429 `terlalu_banyak_upload_form`
- [ ] Cap legacy: sign POST manual tanpa formId lewat 2× batas per pemilik → 429 `terlalu_banyak_upload_tmp`
- [ ] formId milik orang lain (POST manual) → 404 `form_tidak_dikenal` (anti-probing)
- [ ] DevTools: `POST /api/uploads/sign` 200, `public_id` berawalan `form/`
  (dan TIDAK berbentuk `form/form/…`)
- [ ] SQL Editor: baris `form_images` milik upload → `state='used'`,
  `form_id` terisi (menandai pindah otomatis setelah simpanan editor)

## 5. Publish
- [ ] Tombol Publish → versi +1, toast "terpublikasi", tautan `/f/<slug>`
- [ ] Publish form tanpa pertanyaan → ditolak dengan daftar masalah
- [ ] Edit sekali lagi + publish → versi naik; halaman publik memuat schema
  terbaru

## 6. Isi form publik (desktop)
- [ ] `/f/<slug>`: tema "Kaca · Blush" tampil, banner tampil, toggle dark ikut
- [ ] Widget Turnstile terlihat; isi normal → diarahkan ke `terima-kasih`
- [ ] Klik Kirim 2× cepat → hanya 1 respons baru; klik kedua tetap diarahkan ke
  terima-kasih (idempoten rpc)
- [ ] Tempel payload besar (> 64KB) → banner `payload_besar`
- [ ] Kosongkan/matiin widget captcha (devtools) → submit → `captcha_belum_diisi`
- [ ] Spam 11× dalam semenit → banner ratelimit (10/menit)
- [ ] Form di-close dari dashboard → halaman publik menampilkan `sudah_tutup`;
  kuota tercapai → `penuh`

## 7. Respons & CSV
- [ ] Halaman respons: total, pilihan-jawaban populer, tabel ringkasan;
  id form milik orang lain → 404/redirect prosaik
- [ ] Ekspor CSV → terbuka di Excel/LibreOffice: kolom benar; jawaban diawali
  `=`, `+`, `-`, `@` di-escape (aman formula injection); BOM UTF-8 ada
- [ ] Header export: `no-store` + `content-type: text/csv`

## 8. Laporkan (anon)
- [ ] Klik "Laporkan" → isi alasan singkat → banner HIJAU `lapor_ok`
  (role=status, bukan merah galat)
- [ ] Spam 6×/menit → ditolak oleh rate limit

## 9. Moderasi keamanan (merobek dari review T-62)
- [ ] XSS: jawaban berisi `<img src=x onerror=alert(1)>` → di halaman respons
  builder tampil sebagai TEKS polos (tidak dieksekusi)
- [ ] CSV injection: jawaban `=HYPERLINK("http://x")` → di CSV berawalan `'`
- [ ] Schema nakal: PATCH tema via API (font off-whitelist / publicId tanpa
  awalan `form/`) → validator server menolak

## 10. Mobile (HP nyata; minta 2–3 teman coba via link)
- [ ] Halaman form: terbaca, tap target nyaman, tanpa pinch-zoom dipaksa
- [ ] Turnstile muncul & submit sukses
- [ ] Builder di HP: minimal terbaca statusnya (desktop-first — bug catat
  untuk backlog)
- [ ] Masukan teman (keliru paham teks, langkah membingungkan) → catat backlog

## Bukti akhir
- [ ] Tiap langkah ✓ (atau anomali dicatat → dibuat tugas backlog di TODO.md)
- [ ] Log Vercel: tidak ada 500 tak terjelaskan
