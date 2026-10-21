# AGENTS.md — Aturan Bersama Semua Agent (Form Builder)

Berlaku untuk SEMUA agent/tab. Singkat sengaja. Detail ada di TASK.md.
Project ini TERPISAH dari repo menfess: repo sendiri, project Vercel sendiri, akun Supabase & Cloudinary sendiri.

## 1. Urutan baca saat sesi dimulai
1. `AGENTS.md` (ini)
2. `TASK.md` (spesifikasi + kontrak antar agent)
3. `TODO.md` (papan tugas; klaim tugas di sini)
4. `docs/progress.md` (10 entri terakhir saja)

Sebutkan peranmu (A/B/C/D/R/L) dan tugas yang kamu klaim. Jangan coding sebelum klaim.

## 2. Peran & zona tulis
Hanya boleh MENULIS di zona sendiri. Membaca boleh di mana saja.
Path final ditetapkan di Fase 0 (`docs/audit.md`); tabel ini default.

| Peran | Fokus | Zona tulis |
|---|---|---|
| L (lead) | Setup, rencana, kontrak | `docs/**`, `TASK.md`, `TODO.md`, konfigurasi root |
| A (db/auth) | Skema Supabase, RLS, login | `supabase/**`, `src/lib/auth/**`, `src/lib/db/**` |
| B (builder) | Editor visual + dashboard | `src/components/builder/**`, `src/pages/dashboard/**` |
| C (public) | Halaman isi form, submit API, respons, CSV | `src/pages/f/**`, `src/pages/api/**`, `src/lib/forms/**` |
| D (design/ops) | Design tokens, tema, cleanup job, backup | `design/**`, `src/styles/**`, `.github/workflows/**`, `scripts/**` |
| R (reviewer) | Review keamanan & QA (read-only) | `docs/review-*.md` saja |

Butuh perubahan di zona orang lain? Jangan edit. Tulis di TODO.md bagian **Requests**.

## 3. Protokol koordinasi
- **Klaim**: ubah satu baris di TODO.md dari `[ ]` ke `[~] @peran tgl-jam`. Baca ulang file tepat sebelum edit; edit hanya barismu.
- **Selesai**: ubah ke `[x]`, tambah SATU baris di `docs/progress.md`:
  `YYYY-MM-DD HH:MM | @peran | T-xx | apa yang jadi | file utama | catatan untuk agent lain`
- **Blocker**: pindahkan ke bagian **Blocked** di TODO.md, sebut peran yang dibutuhkan.
- **Kontrak berubah** (schema JSON, nama tabel/kolom, status, env, limit): edit bagian Kontrak di TASK.md lalu tulis `CONTRACT CHANGE` di progress.md. Agent lain wajib baca ulang TASK.md.
- Sebelum tugas baru: baca progress.md lagi.
- Jangan mengerjakan tugas berstatus `[~]` milik peran lain.

## 4. Aturan git
- `git add <path zona sendiri>` saja. DILARANG `git add .` / `git add -A`.
- Commit kecil: `feat(form/<zona>): ringkasan`.
- DILARANG: `push --force`, `reset --hard`, `checkout .`, `clean -fd`, `stash`, rebase, menyentuh branch agent lain.
- File berubah yang bukan milikmu: jangan di-revert; catat di progress.md.

## 5. Keamanan (wajib)
- Secret hanya dari env. Jangan dicetak, di-log, di-commit, atau ke frontend.
- `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` hanya dipakai di kode server (endpoint API), tidak pernah di komponen client.
- DILARANG menerima/merender HTML, CSS, atau JS mentah dari user. Kustomisasi hanya lewat JSON `theme` + `blocks` yang divalidasi whitelist.
- Semua input divalidasi di server terhadap schema; output teks user selalu di-escape.
- Responden TIDAK boleh upload file (MVP). Gambar hanya dari pembuat form, lewat upload terkontrol ke Cloudinary.
- RLS aktif di semua tabel. Pembuat hanya akses datanya sendiri.
- Test memakai data dummy dan mock (Turnstile, Cloudinary). Jangan menyentuh akun production saat test.
- Akun Supabase/Cloudinary project ini BARU dan terpisah dari project menfess. Jangan memakai kredensial project menfess.

## 6. Cara kerja
- Baca file sebelum mengubahnya. Jangan menebak API library; cek dokumentasi/versi terpasang.
- Perubahan sekecil mungkin. Jangan menambah dependency besar tanpa alasan di progress.md.
- Satu tugas selesai = test lulus + build lulus + progress.md terisi. Lalu ambil tugas berikutnya.
- Konteks penuh/lambat? `/compact`, atau sesi baru: "baca AGENTS.md, TASK.md, TODO.md, progress.md, lanjut".

## 7. Definition of Done (per tugas)
- [ ] Sesuai acceptance criteria di TASK.md
- [ ] Test relevan ada dan lulus
- [ ] Build/lint lulus
- [ ] Tidak ada secret di diff
- [ ] TODO.md dan docs/progress.md diperbarui
