import { defineConfig } from 'vitest/config';

// Test khusus skrip ops (T-60/T-61). Root `npm test` hanya mengikutkan src/**;
// jalankan: npx vitest run --config scripts/vitest.config.mjs
export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.mjs'],
    passWithNoTests: false,
  },
});
