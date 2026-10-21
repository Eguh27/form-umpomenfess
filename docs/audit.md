# Audit / Setup Awal (dibuat saat scaffold)

- Stack terpasang: Astro (SSR) + @astrojs/vercel, TypeScript, zod. Build lolos (`npm run build`).
- Belum dipilih: framework island untuk builder (React/Preact/Svelte). Agent L pilih satu di T-00.
- Belum ada: lint/test runner (Agent L, T-00).
- Struktur folder dasar sudah dibuat sesuai zona di AGENTS.md (src/lib/{forms,auth,db,config}, src/components/builder, supabase/, design/, docs/).
- Tampilan: situs utama hanya terbaca teks dan theme-color (#BFE8EA). CSS/font aslinya BELUM terbaca, jadi `design/tokens.css` masih sementara. Manusia perlu menyalin file ke `design/reference/` (T-30 Agent D).
- Catatan: kerangka dibuat dengan versi paket terbaru saat itu (Astro 7.x, adapter vercel 11.x). Cek dokumentasi versi terpasang sebelum memakai API (middleware, env, SSR).

## Update T-00 (2026-10-21, @L) — selesai
- **Framework island: React** — `react@19.3.1` + `@astrojs/react@7.1.1` + tipe resmi. Alasan: integrasi Astro paling matang & dokumentasi resmi terkini, ekosistem test lengkap, cocok untuk builder interaktif (undo/redo, panel properti, preview). Sudah `integrations: [react()]` di `astro.config.mjs`; `tsconfig.json` jsx `react-jsx` (diubah otomatis oleh `astro add react`).
- **Lint: ESLint 10 flat config** (`eslint.config.mjs`) dengan `@eslint/js`, `typescript-eslint@8.72`, `eslint-plugin-astro@3.2`. Perintah: `npm run lint` / `lint:fix`. Catatan: `eslint-plugin-jsx-a11y@6.10.2` belum mendukung ESLint 10 — bila Wave 2 perlu lint a11y untuk `.tsx`, pasang `eslint-plugin-jsx-a11y-x` (kompatibel ESLint 10; peer-nya opsional di eslint-plugin-astro).
- **Test: Vitest 5** (`vitest.config.ts`; environment `node`, include `src/**/*.test.ts`, `passWithNoTests`). Perintah: `npm test` / `npm run test:watch`. Test komponen island nanti: tambah devDep `jsdom` + magic comment `// @vitest-environment jsdom` per file.
- **TypeScript diturunkan 7.0.2 → 6.0.3**: peer `typescript-eslint` (<6.1.0) dan `@astrojs/check` (^5||^6) belum mendukung TS 7. Naikkan kembali saat seluruh toolchain mendukung TS 7.
- **Known issue**: `npm audit` 3 vuln high dari rantai `@astrojs/vercel → @vercel/routing-utils → path-to-regexp` (adapter produksi, tidak bisa dilepas). JANGAN `audit fix --force`. Pantau rilis `@astrojs/vercel` > 11 yang membawa perbaikan.
- Info: Node lokal 26, Vercel memakai runtime Node 24 (warning saja; tidak memblokir).
- Verifikasi: lint 0 error · vitest berjalan · `astro check` 0 error · `npm run build` lolos.
