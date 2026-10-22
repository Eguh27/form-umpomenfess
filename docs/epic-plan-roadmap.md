# Epic Plan Roadmap — "sebaiknya diapakan project ini?"

- Disusun @L · 2026-10-22 · Basis: board `TODO.md`, 2 dokumen review (T-62/63),
  32 commit, 5 migrasi, 145 test app + 34 test ops, gates hijau.
- Catatan adaptasi: dokumen memakai kerangka Epic Planning (12 seksi + risk
  framework) tetapi **tanpa Jira/Confluence** — "tiket" = baris `TODO.md`,
  "publish" = dokumen ini di `docs/`. Dokumen implan berikutnya dipisah file
  (lihat "Next Step" di akhir).

---

## 1. Epic Overview — EPIC-A: MVP → Produksi Stabil (v1.0)

- **Purpose:** memindahkan project dari "MVP rapi di main" ke "produksi hidup
  yang terobservasi aman" — golive nyata, telemetri, dan tutup utang kecil
  yang menahan skala.
- **User Value:** pembuat form bisa dipercaya (data aman, tidak hilang),
  owner bisa melihat masalah sebelum pengguna mengeluh, spam tertahan.
- **Scope IN:** eksekusi golive (T-65/66), observability minimal, cap upload
  eksak per-form, rate-limit tahan multi-instance, retensi/arsip data.
- **Scope OUT:** billing/tier berbayar, editor visual tingkat 2, i18n, tema
  custom CSS (tetap dilarang render mentah) — masuk epics berikutnya.
- **Stakeholders:** owner project (manusia), responden (anon), D (ops).

## 2. Goals & Success Metrics

- **Primary Goal:** 30 hari produksi tanpa insiden data; golive checklist
  100% ✓; uji manual 0 blocker.
- **Success Metrics:**
  - M1 — golive: domain hidup + HTTPS + login & submit end-to-end di prod.
  - M2 — observability: 5xx terlihat di inbox < 1 jam (alerting aktif).
  - M3 — spam: 0 respons anon tanpa token Turnstile valid.
  - M4 — backup: restore rehearsal berhasil dgn RPO ≤ 7 hari.
- **KPI mikro:** p95 latensi submit < 600 ms (serverless), eksport CSV 2k
  baris tetap bekerja, cleanup mingguan menghapus 0 baris yang masih dirujuk.

## 3. Requirements Summary

**Fungsional (dari board/diskusi, terbuka):**
- R1 — cap gambar eksak per-form saat SIGN: klien B mengirim `formId`,
  server C memvalidasi miliknya, baris `form_images` lahir dgn `form_id`
  (buhkan interim cap 2×per-owner lagi).
- R2 — retensi/arsip: kolom `archived_at` (opsional, keputusan @D/@A) +
  perilaku app ketika form diarsip.
- R3 — konfirmasi visual lokasi berkas Cloudinary bila param `folder` +
  `public_id` berpath dikirim bersama (peringatan D; docs bilang aman).

**Non-fungsional:**
- NF1 — rate-limit & anti-replay kini in-memory **per-instance** Vercel;
  untuk multi-instance butuh store TTL bersama (Upstash Redis ATAU tabel
  Supabase + RPC, tanpa vendor baru).
- NF2 — observability: alert error (log drain/Sentry) + uptime ping.
- NF3 — security header tambahan (`Strict-Transport-Security`,
  `Referrer-Policy`) bila belum jadi bawaan Vercel.

**Edge yang harus tetap kena (regresi):** double-click lintas instance
(index unik + fast-path `duplikat`), payload chunked palsu (byte cap
sebenarnya), CSV injection (escape), kuota TOCTOU (rpc `FOR UPDATE`),
Turnstile fail-closed, RLS milik-only.

## 4. Technical Change Overview (EPIC-A)

| Component | Tipe | Deskripsi | Risiko (7-dim, 1–3) | Deps |
|---|---|---|---|---|
| sign + uploadRules + Editor | Enhancement | kirim `formId` saat sign → cap eksak `maxImagesPerForm` per form | scope1/dep2/block1/stab2/ux1/test2/rev1 = **10 (Low)** | — |
| rateLimit.ts (+ env `RATELIMIT_BACKEND=memory|redis`) | Enhancement | backend store TTL pluggable; memory tetap default MVP | 2/2/2/2/1/2/2 = **13 (Med)** | keputusan ops |
| observability | New | alert 5xx + uptime ping (GH Actions/Upptime/log drain) | 2/2/1/2/1/2/1 = **11 (Low)** | pilihan vendor |
| `archived_at` (opsional) | Enhancement | arsip form > 6 bulan | 2/2/1/1/2/2/2 = **12 (Med)** | keputusan owner |
| T-65/66 eksekusi | Process | manusia menjalankan checklist & uji | — | wajib dulu |

Risiko-dim: scope/deps/blocking/stability/UX/testing/reversibility.
**Tidak ada item High** — tingkat tinggi hanya muncul bila menambah infra
besar tanpa kebutuhan nyata; dihindari.

## 5. Impact Analysis

- **Codebase:** 4 file tepi utk R1 (`src/lib/forms/sign.ts`,
  `src/pages/api/uploads/sign.ts`, `src/components/builder/uploadRules.ts`,
  `Editor.tsx`) — kecil dan terisolasi.
- **Data Model:** R1 hanya mengisi kolom `form_id` yang SUDAH ada; R2 satu
  kolom nullable (1 migrasi, backward-safe).
- **API:** `POST /api/uploads/sign` menerima field opsional `formId`
  (uuid) — klien lama tanpa formId tetap jalan (interim guard dipertahankan
  sampai klien menambah field).
- **UI/UX:** tiada layar baru; hanya pesan 429 yang lebih tepat.
- **Migration Strategy:** deploy app sebelum/sesudah migrasi aman (fallback
  legacy di rpc; field opsional di sign).
- **Rollback:** redeploy commit sebelumnya; kolom nullable memang aman;
  observability murni tambahan infra (dapat dimatikan).
- **Tradeoff:** store TTL bersama menambah 1 komponen infra — dipilih opsi
  "tabel Supabase + TTL" sebagai default agar tidak menambah vendor baru.

## 6. Testing Strategy

- **Unit:** pola fake-client supabase (seperti imagesUsed.test/rateLimit.test);
  tambah test cap eksak + dtk test milik-formId (403/404 bila milik lain).
- **Integration:** SQL manusia `tests/*.sql` (pola transaction+rollback):
  test cap 5/form; `npm run test:ops` (34) tetap hijau.
- **API:** smoke curl diperluas: sign dgn formId sendiri vs milik orang lain.
- **Target Coverage:** ≥90% branch utk sign/uploadRules (file kecil,
  deterministik); rate limiter baru dgn fake clock (pola sudah ada).
- **E2E otomatis (opsional kedepan):** Playwright utk jalur publik submit
  (ganda-klik & payload) SETELAH golive — pakai skill playwright bila akan
  ditulis; sekarang belum wajib.

## 7. User Behavior Testing

E2E scenario bersumber `docs/uji-manual.md` §1–10 — dilakukan manusia dulu
(T-65); konfirmasi regresi: seluruh jalur gagal submit (captcha/ratelimit/
kuota/tutup/payload), antar-halaman respons, CSV eksport, banner upload (cap
+ mark used), laporan.

## 8. Implementation Notes

- **Patterns to follow:** fallback legacy (pola guardedInsert), fail-soft
  boolean (pola imagesUsed), SQL manusia (pola tests/*.sql), unit fake-client.
- **Architecture:** tetap "keputusan di endpoint server; RLS di DB; klien
  tanpa secret". Tidak menambah layer tanpa kebutuhan.
- **Technical Debt terbuka & diakui:** rate-limit per-instance (NF1), cap
  interim 2× (R1), laporan dibaca manual via SQL (panel admin belum ada).
- **Security:** tidak ada kunci baru; R1 memperketat milik (formId milik
  user); observability wajib TIDAK mencatat secret/PII (respons anon).

## 9. Acceptance Criteria

- [ ] Golove checklist `docs/golive-checklist.md` semua ✓ (manusia)
- [ ] Uji manual `docs/uji-manual.md` semua ✓ (manusia + teman)
- [ ] R1 cap eksak: unit + SQL test hijau; form milik orang lain ditolak;
      429 dengan pesan jelas
- [ ] NF1 backend pluggable aktif dgn flag env; memory masih default MVP
- [ ] NF2 satu kanal alert aktif + uptime ping aktif (bukti alert test)
- [ ] NF3 header tambahan terpasang (bila belum bawaan)
- [ ] Restore rehearsal berhasil (bukti, ikuti docs/restore.md)
- [ ] `npm test` ≥145, `test:ops` 34, lint/check/build hijau

## 10. Open Questions & Risks

- **Blockers:** eksekusi manusia (migrasi font di prod bila belum, push
  branch, golive/feedback uji) — kode & dokumen sudah siap.
- **Unknowns:** (1) pilihan/anggaran observability (Sentry vs log Vercel +
  GH Actions); (2) vendor store TTL (Upstash free tier layak?).
- **Assumptions:** trafik awal rendah (<1k submit/hari) — in-memory masih
  layak SEBELum NF1 dieksekusi.
- **Risks & mitigasi:** spam multi-IP → Turnstile + CF rate rules (bukan
  kode); vendor lock → default "tabel Supabase"; cold-start memseting map →
  identity idempoten di DB sudah menutup; kuota free Cloudinary → cap +
  cleanup mingguan.

## 11. Codebase Analysis

**Affected Modules (EPIC-A):**
- `src/lib/forms/` — sign.ts, rateLimit.ts, service.ts
- `src/pages/api/uploads/sign.ts` · `src/components/builder/{Editor.tsx,uploadRules.ts}`
- `scripts/` + `.github/workflows/` (ops D) — utk NF1/NF2

**Patterns Discovered:**
- API: endpoint Astro + zod parse + jsonError/redirectBack + no-store;
  cek murah→mahal dulu; service role HANYA di server (service.ts cache
  module-level).
- Test: vitest co-located `*.test.ts` (fake client pola) + ops vitest
  `scripts/vitest.config.mjs` via `npm run test:ops` + SQL manusia
  `tests/*.sql` (transaction+rollback).
- Komponen: Astro page (guard + pengukuran RLS) + React island minimal via
  browserClient (PUBLIC_* saja); nol `set:html`.
- DB: 5 migrasi berurut; RLS aktif semua tabel; view publik `public_forms`;
  rpc atomik; partial unique index `client_token`.

**Reference Implementations:**
- Cap eksak: sign kini benar-benar menghitung baris `form_images(state='tmp')`
  per owner — pola sama tinggal di ganti per-form.
- Store TTL: `checkAndRecord` sudah terisolasi → swap backend plugable tanpa
  menyentuh endpoint.

**Test Locations & Conventions:** seperti "Patterns" di atas; mocking bawaan
vitest; belum ada framework E2E terpasang (Playwright opsional ke depan).

## 12. Linked "Tickets" (adaptasi board)

Epic induk: `TODO.md` — semua T-1…T-66 [x] KECUALI eksekusi T-65 oleh
manusia ([~]). Story baru EPIC-A (belum dibuat di board):

| Usulan | Ringkas | Tipe | Est |
|---|---|---|---|
| E-A1 | `formId` pada sign + cap eksak + test | Code (B+C) | 0.5 hari |
| E-A2 | backend rate-limit pluggable (memory default) + test | Code (C) | 0.5 hari |
| E-A3 | alert 5xx + uptime ping | Ops (D) | 0.5 hari |
| E-A4 | HSTS/Referrer-Policy bila belum bawaan | Ops (D) | 0.25 hari |
| E-A5 | `archived_at` + kebijakan arsip (opsional) | Code (A/D) | 0.5 hari |
| E-A6 | T-65 eksekusi + T-66 checklist | Process (manusia) | 1 hari |

---

## BACKLOG — epics setelah EPIC-A (draft, butuh keputusan)

| Epic | Value | Perkiraan | Prasyarat |
|---|---|---|---|
| **B — Panel admin laporan** (tampil & close report, tanpa SQL) | operasi risiko tertinggi yang belum punya UI | 1–2 hari | keputusan tampilan admin |
| **C — Tier & batas** (free; upgrade opsional) | jalan terus tanpa billing | 1 hari (tanpa billing) | keputusan model |
| **D — Editor UX tingkat 2** (duplikat blok, keyboard, drag-drop) | ritme kerja pembuat form | 2–3 hari | — |
| **E — Tema dinamis** (load font Google secara dinamis dalam whitelist; varian radius) | variasi tanpa membuka XSS | 1 hari | pipeline font |
| **F — Notifikasi** (digest email / webhook sederhana) | owner tanpa buka dashboard | 1–2 hari | akun email provider |
| **G — i18n id/en** | jangkauan luas | 1 hari | tabel copy |
| **H — Observability tingkat 2** (dashboard metrik, structured logs) | insiden cepat ditemukan | 1–2 hari | E-A3 |
| **I — Backup tingkat 2** (PITR Supabase aktif) | RPO lebih kecil | 0.5 hari | keputusan biaya |

**Rekomendasi urutan:** eksekusi golive manusia dulu (T-65/66) → E-A1…A4
(belt-and-braces ±1.5 hari) → BACKLOG: pilih **B (Panel admin laporan)**
terlebih dulu, karena laporan kini hanya terbaca via SQL manual — risiko
operasi harian tertinggi yang belum punya wajah UI.
