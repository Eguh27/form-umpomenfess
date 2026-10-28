# Skrip Uji Manual — T-65 @L

- Pembuat: L · 2026-10-22 — Diperbarui & Ditutup: 2026-10-28 pasca-T68.
- Status: **SELESAI (100% LULUS)**
- Dokumen verifikasi: `docs/review-golive-verification.md` & `docs/review-e2e-T68.md`.

## 1. Login & dashboard
- [x] `/login` → masuk via Google / email → kembali ke `/dashboard` (daftar form + tombol buat)
- [x] Anonim buka `/dashboard` → dialihkan ke `/login`
- [x] Respons halaman bawa header `cache-control: private, no-store` (DevTools → Network)

## 2. Buat form — kosong & template
- [x] "Buat baru" → form muncul di daftar dengan slug otomatis
- [x] Salin salah satu template (dari 5) → **autosave lulus** (font seed sudah dalam whitelist); badge "Tersimpan" muncul sesuai debounce
- [x] Tautan `Respons` tampil di breadcrumb builder

## 3. Isi form di builder
- [x] Tambah heading/divider/pertanyaan tiap jenis (short, paragraph, single, multiple, dropdown, scale 1–5) → preview mengikuti
- [x] Toggle wajib, maxLength, min/max scale; undo/redo; pindah urutan blok
- [x] Batas: tambahkan blok sampai batas `LIMITS` → pesan batas ramah
- [x] Anti-phishing guard (T-83): deteksi pertanyaan sensitif memblokir publikasi tanpa mematikan draft autosave

## 4. Banner (upload Cloudinary — uji live penuh T-42 & T-74)
- [x] Upload JPG/PNG ≤ 2MB / WebP → preview banner muncul, autosave sukses
- [x] Upload > 2MB / file ≠ gambar → ditolak dengan pesan yang jelas
- [x] Cap eksak (E-A1): lewat Editor (banner, kirim formId) unggah gambar ke-6 → 429 `terlalu_banyak_upload_form`
- [x] Cap legacy: sign POST manual tanpa formId lewat 2× batas per pemilik → 429 `terlalu_banyak_upload_tmp`
- [x] formId milik orang lain (POST manual) → 404 `form_tidak_dikenal` (anti-probing)
- [x] DevTools: `POST /api/uploads/sign` 200, `public_id` berawalan `form/` (dan TIDAK berbentuk `form/form/…`)
- [x] SQL Editor: baris `form_images` milik upload → `state='used'`, `form_id` terisi (menandai pindah otomatis setelah simpanan editor)

## 5. Publish
- [x] Tombol Publish → versi +1, toast "terpublikasi", tautan `/f/<slug>`
- [x] Publish form tanpa pertanyaan → ditolak dengan daftar masalah
- [x] Edit sekali lagi + publish → versi naik; halaman publik memuat schema terbaru

## 6. Isi form publik (desktop)
- [x] `/f/<slug>`: tema "Kaca · Blush" tampil, banner tampil, toggle dark ikut
- [x] Widget Turnstile terlihat; isi normal → diarahkan ke `terima-kasih`
- [x] Klik Kirim 2× cepat → hanya 1 respons baru; klik kedua tetap diarahkan ke terima-kasih (idempoten rpc)
- [x] Tempel payload besar (> 64KB) → banner `payload_besar`
- [x] Kosongkan/matiin widget captcha (devtools) → submit → `captcha_belum_diisi`
- [x] Spam submit berulang → ditolak kuota / captcha / rate limit
- [x] Form di-close dari dashboard → halaman publik menampilkan `sudah_tutup`; kuota tercapai → `penuh`

## 7. Respons & CSV
- [x] Halaman respons: total, pilihan-jawaban populer, tabel ringkasan; id form milik orang lain → 404/redirect prosaik
- [x] Ekspor CSV → terbuka di Excel/LibreOffice: kolom benar; jawaban diawali `=`, `+`, `-`, `@` di-escape (aman formula injection); BOM UTF-8 ada
- [x] Header export: `no-store` + `content-type: text/csv`

## 8. Laporkan (anon)
- [x] Klik "Laporkan" → isi alasan singkat → banner HIJAU `lapor_ok` (role=status, bukan merah galat)
- [x] Moderasi tersimpan di tabel `reports` dengan status `'pending'` untuk ditinjau admin di `/dashboard/admin/laporan`

## 9. Moderasi keamanan (merobek dari review T-62)
- [x] XSS: jawaban berisi `<img src=x onerror=alert(1)>` → di halaman respons builder tampil sebagai TEKS polos (tidak dieksekusi)
- [x] CSV injection: jawaban `=HYPERLINK("http://x")` → di CSV berawalan `'`
- [x] Schema nakal: PATCH tema via API (font off-whitelist / publicId tanpa awalan `form/`) → validator server menolak
- [x] `npm run audit:security`: 0 temuan, bundle client bersih dari `service_role`

## 10. Mobile (HP nyata & Emulasi Responsive)
- [x] Halaman form: terbaca, tap target nyaman, tanpa pinch-zoom dipaksa (viewport-fit=cover)
- [x] Turnstile muncul & submit sukses di mobile
- [x] Multi-halaman form: stepper "Halaman X dari Y" + navigasi Kembali/Lanjut responsif di layar sempit
- [x] Dark mode di mobile: kontras teks dan tombol memenuhi standar WCAG

## Bukti akhir
- [x] Seluruh langkah di atas terverifikasi LULUS (✓).
- [x] Log Vercel / serverless: 0 error 500 tak terjelaskan.
