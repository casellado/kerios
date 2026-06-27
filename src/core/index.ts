/**
 * `core/` — nucleo CONDIVISO, estraibile in `kerios-core` (M11).
 *
 * Contiene ciò che K2 e Kerios DEVONO condividere senza divergere:
 *  - il contratto JSON del verbale (`contratto.ts`) — già qui da M0;
 *  - (M1) i tipi di dominio NTC usati anche da K2;
 *  - (M10/M11) il client del Cuore e le funzioni sigle.
 *
 * È TS PURO: niente React, niente DOM, niente strato io (forzato da ESLint).
 */
export * from './contratto.ts';
export * from './tipi-cls.ts';
export * from './soglie.ts';
export * from './sigle.ts';
