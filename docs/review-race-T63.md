# Review Race Condition — T-63 @R

- Reviewer: R (read-only) · Tanggal: 2026-10-22 · Commit ditinjau: `ae1c337`
- Fokus TASK 9: race condition batas respons + idempotensi submit.
- Konteks: Vercel serverless (Node per-isolate, single-thread per instance);
  DB = Supabase Postgres; RLS aktif.

## Ringkasan verdict

| # | Temuan | Severity | Pemilik | Rekomendasi T-64 |
|---|---|---|---|---|
| R1 | Kuota respons: cek `count` lalu `insert` — dua langkah terpisah (TOCTOU); request concurrent di batas kuota bisa melewatkan `max_responses` beberapa baris | **Sedang** | @A (+@C memakai) | 🟡 FILE SIAP `supabase/migrations/20261022174000_submit_guard.sql` + `tests/submit_guard.sql` (rpc `insert_response_guarded`: kunci form FOR UPDATE → fast-path duplikat → cek kuota dalam transaksi sama dgn insert) — **menunggu manusia mengeksekusi SQL**; endpoint C memakai rpc + fallback legacy otomatis |
| R2 | Idempotensi lembut (map in-memory) gugur saat restart/skala-out; urutan cek juga membahayakan UX double-click | **Sedang** | @A + @B | 🟡 a. FILE SIAP: kolom `responses.client_token` + partial unique index (di migrasi yang sama, R1) — menunggu eksekusi manusia; duplikat via DB dimap 'duplikat' → sukses UX. b. @B disable tombol setelah klik pertama (belum ada). SISI @C SUDAH: cek replay kini SEBELUM verifikasi captcha + token ditanam halaman |
| R3 | Map rate-limit tidak dibatasi jumlah IP unik → DoS memori oleh flood IP | Rendah | @C | ✅ dibaih @C di T-64 (cap 10k IP → clear) |
| R4 | Replay map `clear()` sekaligus saat >5000 → amnesia massal (buang semua token sah lain) | Rendah | @C | ✅ dibaih @C di T-64 (evict FIFO ring, bukan clear massal); R2b: cek replay pindah SEBELUM captcha |
| R5 | `form_images` cap: cek count lalu insert juga TOCTOU | Rendah | @C (kelas R1) | cukup approximated MVP; row orphan tak terpakai disapu T-60 |
| R6 | Submit membaca `version` di t0, insert `form_version` di t1; owner publish (version++) di antaranya | Info | — | DESAIN OK: baris mencatat versi schema yang DIJAWAB responden |
| R7 | Publish double-click → version++ dua kali (schema sama) | Info | — | tidak berbahaya |
| R8 | Slug race antar user ditangani: `23505` → retry suffix acak (dashboardForms L124–150) | Info | @B ✓ | sudah baik |

## Detail R1 — kenapa TOCTOU nyata

Alur `submit.ts`: `select count exact` → `closedState()` → `validateSubmit`
→ `insert responses`. Dua request bersamaan di kuota 2000: keduanya melihat
`count=1999` → keduanya insert → 2001 baris. Dampak MVP kecil (batas santai
lewat sedikit), TAPI pola yang sama menjadi celah jika kuota dipakai untuk
sesuatu yang tegas (mis. kuota hadiah). Penjaga satu-statement SQL = atomik.

## Detail R2 — idempotensi & urutan captcha

1. Kini: `client_token` random (script inline) → map server `${ip}:${token}`;
   remember() HANYA sesudah insert sukses (jalur gagal tidak mengunci token) ✓.
2. MASALAH urutan: cek replay berjalan SETELAH verifikasi captcha. Token
   Turnstile single-use — klik kedua (double-click) membawa token yang sama,
   GAGAL di captcha (`captcha_ditolak`) sebelum mencapai cek replay; user
   melihat banner error padahal jawaban pertamanya sukses tersimpan.
3. Perbaikan aman: panggil `alreadySeen()` SEBELUM `verifyTurnstile()` — tidak
   menciptakan bypass: (i) request pertama dengan token itu selalu diperiksa
   captcha penuh; (ii) request tanpa token tak terpengaruh; (iii) replay hanya
   menekan INSERT kedua (efek samping nol) dan memberi UX tepat (redirect
   terima kasih).
4. Dengan (a) index unique @A: insert duplikat ditolak Postgres → endpoint
   memperlakukan sebagai sukses — idempotensi jadi KUAT lintas restart/instance.
   Map in-memory 5 menit per-instance adalah jalan MVP yang jujur (terdokumen);
   kekuatan penuh menunggu (a).

## Bukan-race yang juga dicek

- `checkAndRecord` sinkron di Node single-thread → aman dalam instance ✓.
- Slug `23505` retry ✓; autosave debounce per-klien + idempotent update ✓.
- reports insert konkuren: tanpa kuota; spam dicek rate limit + RLS published ✓.
- Export CSV baca tunggal → snapshot konsisten ✓.
- Sesi: getUser setiap request (middleware) → refresh cookie via setAll ✓.

## Test yang disarankan saat pembaikan (T-64)

1. Dua submit konkuren saat kuota tersisa 1 → keduanya diproses tapi total
   tidak melewati batas — butuh rpc SQL (dieksekusi manusia, pola seperti
   `tests/rls.sql`); C bisa dulu uji unit rekonstruksi logikanya.
2. Double-click: token Turnstile mock dipakai ulang → harapan 303 ke
   terima-kasih DAN jumlah insert tidak bertambah (count invarian).
3. Replay token lintas form A→form B: token B belum pernah terverifikasi →
   submit B wajib verifikasi captcha penuh.
