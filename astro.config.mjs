import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

// SSR di Vercel. Halaman dinamis (dashboard, /f/[slug], /api/*) berjalan di server.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: process.env.PUBLIC_SITE_URL || 'https://form.umpomenfess.my.id',
  integrations: [react()],
});