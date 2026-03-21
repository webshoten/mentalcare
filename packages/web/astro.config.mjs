import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import aws from 'astro-sst';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  server: { host: '0.0.0.0' },
  adapter: aws(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      global: 'globalThis',
    },
  },
});
