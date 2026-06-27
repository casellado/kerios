# Kerios

Web app **client-side pura** per i controlli di accettazione dei materiali
strutturali secondo le **NTC 2018**. Nessun backend per l'app; deploy su
Cloudflare Pages. Vedi `CLAUDE.md` e `docs/` per le specifiche (fonte di verità).

## Comandi

```bash
npm install        # dipendenze
npm run dev        # sviluppo (http://localhost:5173)
npm run build      # type-check (tsc -b) + build di produzione → dist/
npm run preview    # serve la build di produzione in locale
npm test           # vitest (engine NTC; in M0 solo sanity)
npm run lint       # ESLint (incl. confine architetturale dominio puro)
npm run format     # Prettier
```

## Architettura (confine sacro, vedi docs/architettura.md)

```
ui/ (React) → domain/ (TS puro, NTC) → io/ (persistenza, parsing, pdf)
core/ = nucleo condiviso K2↔Kerios (contratto JSON, estraibile in kerios-core)
```

`domain/` e `core/` sono TS puri: niente React/DOM/io. La regola è imposta da
ESLint (`no-restricted-imports`), non solo dalla disciplina.

Persistenza local-first: **IndexedDB** (Dexie) come archivio di lavoro,
partizione **per WBS** (volumi reali ~65.000+ record). Vedi docs/scala-e-persistenza.md.

## Deploy Cloudflare Pages

`vite build` → `dist/`, `base: '/'`, fallback SPA via `public/_redirects`.
La pipeline `.github/workflows/deploy.yml` builda e (se configurato) pubblica con
`cloudflare/wrangler-action@v3`. Attivazione lato PO: creare il progetto Pages e
aggiungere i secret `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`.

## Stato

M0 — scaffold e tre porte navigabili (Calcestruzzi attiva come landing; Acciaio e
Quadro "in costruzione"). Strato IndexedDB predisposto (nessun caricamento in
memoria). Engine NTC = M1.
