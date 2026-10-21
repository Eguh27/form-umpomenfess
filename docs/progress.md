# Progress log
Format: `YYYY-MM-DD HH:MM | @peran | T-xx | apa yang jadi | file utama | catatan untuk agent lain`

2026-10-21 | @L (scaffold awal, dikerjakan di chat) | T-01,T-02 | struktur folder, limits.ts, design/tokens.css sementara, layout Base + halaman awal, build lolos | astro.config.mjs, src/lib/config/limits.ts, design/tokens.css | T-00 belum tuntas: pilih framework island + lint/test. tokens.css masih SEMENTARA (hanya --brand dari situs utama).
2026-10-21 21:31 | @L | T-00 | island React (+@astrojs/react), lint ESLint 10 flat config, test Vitest 5, TS diturunkan ke 6.0.3 (peer typescript-eslint belum dukung TS 7) | eslint.config.mjs, vitest.config.ts, docs/audit.md | Agent lain: pakai `npm run lint`/`npm test`/`npm run check` sebagai DoD; test DOM butuh jsdom (belum terpasang); jangan `audit fix --force` (3 vuln high berasal dari @astrojs/vercel). Git repo sudah di-init lokal (branch main, tanpa remote).
