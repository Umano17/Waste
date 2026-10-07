# Changelog — dispensa

## 1.0.0 — 2026-10-07
Prima versione stabile.

### Studio di fattibilità (`/`)
- 7 capitoli: mercato e concorrenti, fattibilità tecnica, costi per utente, architettura, aspetti legali, modello di business, rischi/verdetto/piano.
- Box "Dato verificato" (fonte + data) e "Stima"; tabelle concorrenti, durate, costi a 100/1.000/10.000 utenti.
- Calcolatore interattivo di costi, margine e punto di pareggio (Claude Sonnet vs Gemini Flash).

### Prototipo (`/prototipo`)
- Lettura scontrino da foto o testo con Claude Sonnet; la foto non viene salvata.
- Schermata di conferma con righe incerte evidenziate e memoria delle abbreviazioni.
- Dispensa digitale: aperto / consumato / buttato, aggiunta manuale, filtri per luogo.
- Linea del tempo per urgenza (rosso ≤2 g, giallo ≤5 g, verde) da tabella categoria × luogo × aperto/chiuso; la scadenza in etichetta ha la precedenza.
- 3 ricette salutari al giorno che usano prima gli ingredienti in scadenza; "L'ho cucinata" toglie gli ingredienti.
- Riepilogo del mattino + invio Telegram (attivo dopo aver inserito token e chat ID).
- Pulsante "Ricomincia": svuota dispensa e ricette, conserva le abbreviazioni imparate.

### Configurazione richiesta (`backend/.env`, non inclusa nel repository)
`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `EMERGENT_LLM_KEY`, `APP_TZ=Europe/Rome`
