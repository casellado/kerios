import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Confine architetturale (CLAUDE.md §1, architettura.md):
 *   ui → domain, ui → io, io → domain
 *   VIETATO: domain → ui, domain → io, domain → react/DOM/IO
 * Il dominio (src/domain) e il nucleo condiviso (src/core) sono TS PURI:
 * niente React, niente DOM, niente strato io. La regola sotto lo fa rispettare
 * dal linter, non solo dalla disciplina.
 */
const confineDominio = {
  files: ['src/domain/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          { name: 'react', message: 'Il dominio è TS puro: non importare React.' },
          { name: 'react-dom', message: 'Il dominio è TS puro: non importare react-dom.' },
          { name: 'dexie', message: 'Il dominio non conosce la persistenza (io/).' },
          { name: 'zustand', message: 'Il dominio non conosce lo store UI.' },
        ],
        patterns: [
          { group: ['**/io/**', '**/ui/**', '**/stato/**'], message: 'Il dominio non importa da io/ui/stato.' },
        ],
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ['dist', 'reference', 'node_modules', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  confineDominio,
  prettier,
);
