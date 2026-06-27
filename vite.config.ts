import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Cloudflare Pages serve dalla root del dominio → base '/'.
// (Su GitHub Pages servirebbe il prefisso /repo; qui NON serve — vedi architettura.md.)
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // il dominio è TS puro: i test girano senza DOM.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
