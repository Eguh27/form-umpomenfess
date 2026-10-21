# Audit / Setup Awal (dibuat saat scaffold)

- Stack terpasang: Astro (SSR) + @astrojs/vercel, TypeScript, zod. Build lolos (`npm run build`).
- Belum dipilih: framework island untuk builder (React/Preact/Svelte). Agent L pilih satu di T-00.
- Belum ada: lint/test runner (Agent L, T-00).
- Struktur folder dasar sudah dibuat sesuai zona di AGENTS.md (src/lib/{forms,auth,db,config}, src/components/builder, supabase/, design/, docs/).
- Tampilan: situs utama hanya terbaca teks dan theme-color (#BFE8EA). CSS/font aslinya BELUM terbaca, jadi `design/tokens.css` masih sementara. Manusia perlu menyalin file ke `design/reference/` (T-30 Agent D).
- Catatan: kerangka dibuat dengan versi paket terbaru saat itu (Astro 7.x, adapter vercel 11.x). Cek dokumentasi versi terpasang sebelum memakai API (middleware, env, SSR).
