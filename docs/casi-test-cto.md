# Casi test del CTO — calcolati a mano (per M3)

> Questi 8 gruppi di casi sono stati calcolati dal CTO in modo INDIPENDENTE dal
> codice (matematica NTC pura). Sono la "tabella delle risposte giuste".
> Code li encoda come test automatici (vitest) in M3, OLTRE ai casi già presenti.
> Quando `npm test` è verde su questi, l'engine è verificato anche sui casi che
> FALLISCONO (finora i dati reali del PO erano tutti sani → testavano solo il "sì").
> Valori di riferimento: vedi colonna "atteso". Tutto in N/mm².
>
> STATO (Code): encodati in `src/domain/__tests__/casi-cto.test.ts` (21 test, verdi).

## Caso 1 — Prelievo NULLO (scarto > 20% del minore)
| R1 | R2 | scarto% atteso | esito atteso |
|----|----|----------------|--------------|
| 50 | 40 | 25,00 | NULLO |
| 60 | 49 | 22,45 | NULLO |
| 45 | 37 | 21,62 | NULLO |

## Caso 2 — Confine validità ESATTO 20% (trap floating-point)
| R1 | R2 | scarto% atteso | esito atteso |
|----|----|----------------|--------------|
| 48 | 40 | 20,00 | VALIDO |
| 60 | 50 | 20,00 | VALIDO |
| 36 | 30 | 20,00 | VALIDO |
> Critico: al 20,00 ESATTO deve dare VALIDO. Senza arrotondamento a 2 prima del
> confronto, (8/40)*100 = 20.0000004 → falsamente NULLO. Già gestito in M1, qui
> si riverifica.

## Caso 3 — TIPO A NON CONFORME (media sotto soglia), Rck 40
soglia media = Rck+3,5 = 43,5 ; soglia min = Rck−3,5 = 36,5
| terzina | Rm atteso | Rmin | d1 (Rm≥43,5) | d2 (Rmin≥36,5) | esito | Rck_eff |
|---------|-----------|------|--------------|----------------|-------|---------|
| 42,41,43 | 42,00 | 41 | NO | sì | NON CONFORME | 38,50 |
| 44,40,41 | 41,67 | 40 | NO | sì | NON CONFORME | 38,17 |

## Caso 4 — TIPO A NON CONFORME (un valore basso → minimo sotto soglia), Rck 40
> Importante: media OK ma un solo cubetto scarso fa cadere il controllo. Mostra
> che ENTRAMBE le disuguaglianze devono valere.
| terzina | Rm | Rmin | d1 | d2 (Rmin≥36,5) | esito | Rck_eff |
|---------|----|------|----|----------------|-------|---------|
| 55,54,35 | 48,00 | 35 | sì | NO | NON CONFORME | 38,50 |
| 50,48,34 | 44,00 | 34 | sì | NO | NON CONFORME | 37,50 |

## Caso 5 — TIPO A CONFORME al limite, Rck 40
| terzina | Rm | Rmin | d1 | d2 | esito | Rck_eff |
|---------|----|------|----|----|----|---------|
| 43,5 · 44 · 45 | 44,17 | 43,5 | sì | sì | CONFORME | 40,67 |
| 44 · 43,5 · 43,6 | 43,70 | 43,5 | sì | sì | CONFORME | 40,20 |

## Caso 6 — TIPO B, dispersione alta (avvisi CV), Rck 40, n=15
valori: 60,30,55,35,58,32,50,40,62,28,45,38,52,33,48
| grandezza | atteso |
|-----------|--------|
| Rm | 44,40 |
| s (campionario n−1) | 11,531 |
| CV | 0,260 |
| soglia (Rck+1,48·s) | 57,07 |
| CV > 0,15 (avviso) | sì |
| CV > 0,30 (rifiuto) | NO |
| d1 (Rm≥soglia) | NO |
> Esito: NON CONFORME per d1, con AVVISO CV alto (ma non rifiuto automatico).

## Caso 7 — TIPO B CONFORME (15 valori buoni, poco dispersi), Rck 40
valori: 52,53,51,54,52,53,51,52,54,53,52,51,53,52,54
| grandezza | atteso |
|-----------|--------|
| Rm | 52,47 |
| Rmin | 51 |
| s | 1,06 |
| CV | 0,02 |
| soglia | 41,57 |
| d1 (Rm≥soglia) | sì |
| d2 (Rmin≥36,5) | sì |
| esito | CONFORME |

## Caso 8 — Selezione automatica Tipo A / Tipo B
| scenario | n | volume m³ | tipo atteso | motivo |
|----------|---|-----------|-------------|--------|
| piccolo | 3 | 200 | A | n<15 e ≤1500 |
| medio | 14 | 800 | A | n<15 e ≤1500 |
| molti prelievi | 15 | 900 | B | n≥15 |
| volume grande | 8 | 1600 | B | >1500 m³ |
| entrambi | 20 | 2000 | B | >1500 m³ e n≥15 |

## Nota per Code
Encoda questi come test vitest aggiuntivi in M3. Se uno fallisce, è un punto dove
il codice diverge dalla norma → segnalalo nel diff, non aggirarlo. Arrotondamenti:
scarto% a 2 decimali prima del confronto; Rck_eff e Rm a 2 decimali in output;
confronti di soglia a precisione piena (come Excel). s campionario (n−1).
