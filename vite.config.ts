import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Cloudflare Pages serve dalla root del dominio → base '/'.
// (Su GitHub Pages servirebbe il prefisso /repo; qui NON serve — vedi architettura.md.)
export default defineConfig({
  base: '/',
  plugins: [react()],
  // exceljs è importato DINAMICAMENTE (code-split per l'export ST36 .xlsx): va
  // pre-bundlato esplicitamente, altrimenti in dev il dynamic import di questa dep
  // CJS pesante non viene risolto ("Failed to fetch dynamically imported module").
  optimizeDeps: { include: ['exceljs'] },
  test: {
    globals: true,
    environment: 'node', // il dominio è TS puro: i test girano senza DOM.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
