# TODO.md — Papan Tugas Multi-Agent (Form Builder)

Legenda: `[ ]` belum | `[~] @peran tgl-jam` dikerjakan | `[x]` selesai | `[!]` blocked
Aturan klaim/selesai: lihat AGENTS.md bagian 3. Edit hanya barismu; baca ulang file sebelum edit.

## Persiapan manusia (sebelum agent jalan)
- [ ] Buat repo baru (mis. `umpomenfess-form`) dan push isi folder project ini, project Vercel baru, tambah domain `form.umpomenfess.my.id` (CNAME di DNS)
- [ ] Akun BARU: Supabase (project baru) dan Cloudinary; buat Cloudflare Turnstile site
- [ ] Aktifkan Google OAuth di Supabase Auth
- [ ] Isi env di `.env.local` dan di Vercel (jangan commit)
- [ ] Salin dari repo menfess ke `design/reference/`: file CSS/token (warna, font, radius), logo, contoh komponen header/footer/kartu
- [ ] Salin AGENTS.md, TASK.md, TODO.md ini ke root repo; buat folder `docs/`

## Cara menjalankan agent
Satu tab terminal per peran, opencode di repo yang SAMA. Prompt pembuka:

> Kamu agent **A** (db/auth). Baca AGENTS.md, TASK.md, TODO.md, docs/progress.md. Klaim tugas `[ ]` pertama yang dependensinya sudah `[x]` untuk perananmu, kerjakan, update TODO.md + progress.md, lalu ambil tugas berikutnya. Berhenti bila tidak ada tugas yang bisa diambil.

Ganti peran: B (builder), C (public), D (design/ops), R (reviewer), L (lead).

## Gelombang
- Wave 0: L sendirian (setup + audit)
- Wave 1: A, C (validator/schema), D (design tokens) paralel
- Wave 2: B (builder + dashboard) dan C (halaman publik, submit, respons) paralel
- Wave 3: D (cleanup/backup) + R (review) + uji akhir

---

## Wave 0 — Setup (L)
- [x] T-00 @L 2026-10-21-21:23 SISA: Astro+TS+adapter Vercel sudah terpasang (lihat docs/audit.md). Tinggal: pilih framework island (satu saja), pasang lint/test runner, catat di `docs/audit.md`
- [x] T-01 @L Struktur folder sesuai zona di AGENTS.md; sesuaikan tabel zona bila berbeda
- [x] T-02 @L Buat `docs/progress.md` dan `src/lib/config/limits.ts` (konstanta limit)

## Wave 1 (butuh T-02)
### A (db/auth)
- [~] T-10 @A 2026-10-21-22:20 Migrasi `forms`, `form_images`, `responses`, `reports`, `templates` (+ kolom `tier`)
- [ ] T-11 @A RLS sesuai TASK 4.4 + view/RPC form publik
- [ ] T-12 @A Test RLS (user A vs B, publik) dengan skrip/SQL
- [ ] T-13 @A Login Google via Supabase Auth + helper session SSR + proteksi `/dashboard`
- [ ] T-14 @A Seed template awal (5-10) dan data dummy

### C (schema/validator dulu)
- [x] T-20 @C 2026-10-21-21:40 `src/lib/forms/schema.ts`: tipe + validator zod sesuai TASK 4.5 (whitelist font/cardStyle/warna)
- [x] T-21 @C 2026-10-21-22:05 Unit test validator (nilai di luar whitelist ditolak, ID duplikat ditolak, batas jumlah blok/pertanyaan)

### D (design)
- [ ] T-30 @D `design/tokens.css` (saat ini SEMENTARA, hanya --brand #BFE8EA yang asli) diganti dengan nilai asli dari `design/reference/` + `design/README.md` (komponen & aturan pemakaian)
- [ ] T-31 @D Layout dasar (header/footer/tombol/kartu) selaras situs menfess, mobile-first
- [ ] T-32 @D Preset kartu `menfess|plain|soft` + whitelist font + cek kontras (fungsi util)

## Wave 2
### B (builder + dashboard; butuh T-13, T-20, T-31)
- [ ] T-40 @B Dashboard: daftar form, buat dari template/kosong, duplikat, tutup, soft delete
- [ ] T-41 @B Builder: tambah/hapus/urut blok (tombol naik/turun), panel properti (color picker, font, radius), simpan draft otomatis
- [ ] T-42 @B Upload banner/gambar (tanda tangan upload, batas ukuran/jumlah, catat `form_images`)
- [ ] T-43 @B Preview live (HP/desktop), undo/redo, peringatan "jangan minta kata sandi", tombol publish + validasi schema
- [ ] T-44 @B Test: builder hanya menghasilkan JSON valid; tidak ada input HTML mentah

### C (public; butuh T-12, T-20, T-31)
- [ ] T-50 @C Halaman `/f/[slug]`: render schema + tema aman (escape), mobile-first, catatan privasi, tombol Laporkan
- [ ] T-51 @C `POST /api/forms/[slug]/submit`: validasi, Turnstile, rate limit, batas respons/tanggal tutup, idempoten
- [ ] T-52 @C Halaman terima kasih + penanganan form tutup/penuh/tidak ditemukan
- [ ] T-53 @C Halaman respons (tabel, ringkasan sederhana) + `export.csv` aman dari CSV injection
- [ ] T-54 @C Test: submit nakal, double submit, IDOR pada export

## Wave 3
- [ ] T-60 @D Workflow cleanup harian/mingguan (tmp, orphan, soft-deleted > 30 hari) dengan mode dry-run
- [ ] T-61 @D Backup mingguan di luar repo + `docs/restore.md`
- [ ] T-62 @R Review keamanan -> `docs/review-security.md` (daftar di TASK 9 WS-R)
- [ ] T-63 @R Review race condition batas respons & idempotensi submit
- [ ] T-64 @A/@B/@C/@D Perbaiki temuan T-62/T-63 di zona masing-masing
- [ ] T-65 @L Uji end-to-end dummy lalu uji di HP dengan beberapa teman
- [ ] T-66 @L Checklist go-live (manusia): env production, domain, Turnstile production, backup aktif, cron dari dry-run ke nyata

---

## Requests (antar agent)
<!-- format: tgl | dari @X | untuk @Y | permintaan -->

## Blocked
<!-- format: T-xx | peran | alasan | butuh @Y -->

## Catatan manusia
- Agent ngawur: `git log`, revert commit agent itu saja, jangan reset seluruh repo.
- Aktifkan cron cleanup nyata dan publish publik hanya setelah T-62 s/d T-65 selesai.
