import { defineConfig } from 'vitest/config';

// Test logika (schema/validator, util) berjalan di node.
// Test komponen island nanti pakai environment jsdom per-file:
// `// @vitest-environment jsdom` (butuh devDep jsdom saat itu).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
