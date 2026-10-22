import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

import react from '@astrojs/react';

// SSR di Vercel. Halaman dinamis (dashboard, /f/[slug], /api/*) berjalan di server.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: process.env.PUBLIC_SITE_URL || 'https://form.umpomenfess.my.id',
  integrations: [react()],
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data: https://res.cloudinary.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://api.cloudinary.com",
        "frame-src https://challenges.cloudflare.com",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
      styleDirective: {
        resources: [
          "'self'",
          'https://fonts.googleapis.com',
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
});