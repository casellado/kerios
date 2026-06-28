# Architettura Kerios

## Principio guida

App **client-side**, statica, deployabile su **Cloudflare Pages** (codice su
GitHub; Pages pubblica a ogni push). Tre strati con
dipendenze a senso unico. Il dominio è puro e testabile; la UI non calcola.

```
┌─────────────────────────────────────────────┐
│  ui/        React, componenti, viste, stato   │
│             — NON contiene formule NTC        │
└───────────────────────┬───────────────────────┘
                         │ usa (import)
┌───────────────────────▼───────────────────────┐
│  domain/    TypeScript PURO                    │
│             verifiche NTC, tipi di dominio     │
│             — NON importa React/DOM/IO         │
└───────────────────────┬───────────────────────┘
                         │ usato da
┌───────────────────────▼───────────────────────┐
│  io/        parsing CSV/XLSX, File System      │
│             Access, IndexedDB, generazione PDF │
└────────────────────────────────────────────────┘
```

Regola di import: `ui → domain`, `ui → io`, `io → domain`.
VIETATO: `domain → ui`, `domain → io`, `domain → react`.

## Struttura cartelle

```
kerios/
├─ CLAUDE.md
├─ docs/                 # specifiche (questo pacchetto)
├─ reference/            # prototipo HTML approvato (look & flusso)
├─ public/
├─ src/
│  ├─ domain/
│  │  ├─ cls.ts          # verifiche calcestruzzo
│  │  ├─ acciaio.ts      # verifiche acciaio (milestone successiva)
│  │  ├─ tipi.ts         # tipi condivisi di dominio
│  │  ├─ stats.ts        # scartoQuadraticoMedio (n-1), helpers
│  │  └─ __tests__/      # vitest: casi da dominio-ntc.md
│  ├─ io/
│  │  ├─ csv.ts          # papaparse, encoding Windows-1252, virgola decimale
│  │  ├─ xlsx.ts         # SheetJS (import/export .xlsx)
│  │  ├─ workspace.ts    # File System Access API + IndexedDB handle store
│  │  ├─ progetto.ts     # load/save file di progetto .kerios.json (atomico)
│  │  └─ verbali/        # templating su template .docx aziendali → docx + pdf
│  ├─ ui/
│  │  ├─ App.tsx
│  │  ├─ Home.tsx        # le tre porte
│  │  ├─ cls/            # modulo calcestruzzi
│  │  ├─ acciaio/        # modulo acciaio
│  │  ├─ quadro/         # quadro generale (proiezione)
│  │  └─ comuni/         # tabella accessibile, filtri, badge, doc-link
│  ├─ stato/             # store applicativo (Zustand o context+reducer)
│  └─ main.tsx
├─ index.html
├─ vite.config.ts        # base: '/' (Cloudflare Pages serve dalla root)
└─ package.json
```

## Modello dati (single source of truth)

Lo stato dell'app contiene:
- `registroCls: Prelievo[]` — righe importate dal registro.
- `registroAcciaio: SaggioAcciaio[]` — (milestone successiva).
- `controlli: ControlloSalvato[]` — i controlli generati dall'utente.
  Ognuno referenzia gli ID dei prelievi inclusi, NON li copia.
- `documenti: Map<codice, FileHandle>` — associazioni codice→PDF (verbali,
  lettere, certificati) collegati via drag&drop o picker.

Il **Quadro generale** è una funzione pura `proietta(controlli) → vista per WBS`.
Non ha stato proprio.

### Parte d'opera: import (campo unico) vs nativo (opera/parte/componente)

> Decisione PO+CTO. Completa il contratto K2↔Kerios (vedi filosofia-kerios.md
> §"La qualità del dato si imposta a monte").

Il prodotto ha due modalità con due strutture del campo "parte d'opera":

- **IMPORT (oggi).** `Prelievo.parte: string` resta un **CAMPO UNICO di testo
  libero** (es. `Sottovia - Palo Fondazione N°18 - KM(1+876,84)`), perché il
  registro importato è dato altrui e sporco. Il raggruppamento dei controlli usa
  **WBS + mix** (NON la parte d'opera, che è inaffidabile come chiave). **NON** si
  introducono ORA i tre campi separati: uno split automatico su testo libero
  sarebbe fragile e contaminerebbe il nucleo da validare.
- **NATIVO (K2 / EUNIKA, dopo).** Il registro generato in campo struttura il dato
  **alla fonte**: `opera`, `parteOpera`, `componente` come **campi DISTINTI** nel
  contratto JSON K2→Kerios. Così a valle non serve più ri-spezzare la parte
  d'opera (oggi fatto a mano nel documento ST36 in *Ubicazione + Denominazione*).

Implicazione per il design del contratto (`core/contratto.ts`,
contratto-json-k2-kerios.md): **prevedere fin d'ora** i campi separati
opera/parte/componente per il dato NATIVO, **mantenendo** `parte` unico per
l'import (il contratto regge entrambe le origini senza divergere).

## Gestione stato

Store leggero (Zustand consigliato; in alternativa Context + useReducer).
Niente Redux. Lo stato di dominio resta serializzabile (per il salvataggio
nel file di progetto).

## Deploy Cloudflare Pages

> Scelta verificata (ricerca 2026): banda illimitata, edge globale 300+ sedi,
> repo privato consentito, niente cold start. Fornitore unico con il Cuore
> (Workers). GitHub resta come archivio del codice (git): Pages si collega al
> repo e ripubblica a ogni push. Sostituisce GitHub Pages, NON GitHub.

- `vite build` → `dist/`; `base` in `vite.config.ts` = `/` (serve dalla root,
  niente prefisso repo come richiedeva GitHub Pages).
- Cloudflare Pages collegato al repo GitHub (privato): build automatica e
  deploy a ogni push su `main`; preview per pull request.
- Router SPA: Cloudflare Pages gestisce il fallback SPA (file `_redirects` con
  `/* /index.html 200`), quindi si può usare un router con path veri (non serve
  più `HashRouter` come su GitHub Pages). HashRouter resta un fallback semplice.
- App utilizzabile solo da contesto sicuro `https://` (Pages lo è).
- Limiti free rilevanti: 500 build/mese (ampi per il team), siti illimitati,
  banda illimitata. Nessun tetto di banda (a differenza dei 100 GB di GitHub).

## Monorepo a M11 (K2 + Kerios condividono kerios-core)

> Decisione PO+CTO (vedi roadmap M11). Non si fa ora: si prepara il terreno.

A M11 le due app — **Kerios** (desktop, legge) e **K2** (Cantiere, scrive) —
vivono in **UN repository monorepo** con **npm workspaces**, condividendo
`kerios-core` (tipi di dominio + schema/validazione JSON del verbale + client del
Cuore). Motivo: *i pacchetti che cambiano insieme vivono insieme* → un singolo
commit allinea entrambe le app e **il contratto JSON non può divergere**.

```
packages/kerios-core   contratto condiviso (oggi = src/core/)
apps/kerios-app        Kerios desktop (oggi = questo progetto)
apps/k2                app Cantiere (operatori)
```

Conseguenza ARCHITETTURALE già attiva: `src/core/` è tenuto **isolato** dal
confine ESLint (`ui → domain → io`; `core/` non importa né React né io) **fin da
M1** proprio per estrarsi in `packages/kerios-core` a costo quasi nullo. Fino a
M11 resta in `src/core/`: nessun costo anticipato di tooling monorepo.

## Qualità minima

- TypeScript strict.
- `vitest` verde sull'engine prima di considerare chiusa ogni milestone con calcoli.
- Lint (ESLint) + format (Prettier).
- Nessun `any` nel dominio.
