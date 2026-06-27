# Filosofia di Kerios — il ponte e il controllo umano

> Modello mentale del PO, dichiarato esplicitamente. Spiega il PERCHÉ di molte
> scelte e guida quelle future. Code e CTO lo usano come bussola quando una
> decisione è ambigua.

## La metafora del ponte (Einstein-Rosen / wormhole)
- A = inizio lavoro, B = fine lavoro.
- Kerios/K2 sono il PONTE che collega A e B: il software percorre la distanza
  (compilazione, calcoli, numerazione, archiviazione, ricerca) al posto della
  persona. Ciò che oggi è un tragitto lungo e faticoso diventa una scorciatoia.
- MA "alcuni passaggi restano umani": il ponte accorcia la distanza, i punti di
  responsabilità restano presidiati da persone.

## Il principio unificante (la bussola)
AUTOMATISMO dove toglie fatica o riduce errori; UMANO dove serve controllo o
giudizio o responsabilità. Applicato ovunque, coerentemente:

| Cosa | Chi/come | Perché |
|------|----------|--------|
| Numeri verbale (Cuore) | automatico | fatica inutile, errore-prone → software |
| Calcoli NTC (Tipo A/B, validità) | automatico | atto legale, errore costa → software |
| Slump / accettazione carico | umano (ispettore) | giudizio tecnico → persona |
| Firme | umano (sul campo, K2) | responsabilità → persona |
| Deposito nella "verità" OneDrive | umano (copia-incolla) | controllo consapevole → persona |
| "Visto" del DL | umano | responsabilità legale → persona |
| Sync locale↔OneDrive | NON automatico (voluto) | il PO vuole che le persone abbiano controllo di ciò che pubblicano |

## Conseguenza: niente automatismi che tolgono controllo
La somiglianza con la blockchain (libro mastro OneDrive + nodi PC) è VOLUTA, ma
SENZA la riconciliazione automatica: il deposito è un gesto consapevole, non un
sync alle spalle dell'utente. Così la persona sa sempre cosa ha pubblicato e
quando. Vedi struttura-cartelle.md, correzioni-e-viste.md.

## Come usare questa bussola (per Code e CTO)
Davanti a una scelta "automatizziamo o lasciamo all'utente?", chiedersi:
- questo passaggio è FATICA ripetitiva o fonte di ERRORE? → automatizzare.
- questo passaggio richiede GIUDIZIO, RESPONSABILITÀ o CONTROLLO? → lasciarlo
  umano (ma renderlo facile e guidato dal bot/UI).
Nel dubbio, sui punti che hanno valore legale o decisionale, preferire il
controllo umano con assistenza, non l'automatismo cieco.
