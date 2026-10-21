// @ts-check
import eslint from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['dist/', 'node_modules/', '.astro/', '.vercel/'],
  },

  // Global config
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // .astro
  ...eslintPluginAstro.configs.recommended,

  // Island React (.tsx) dijalankan di browser
  {
    files: ['**/*.tsx'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Config root (astro/vitest/eslint) berjalan di Node
  {
    files: ['*.config.mjs', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Skrip node (cleanup/backup Wave 3)
  {
    files: ['scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
