# dispensa — SPEC

App in italiano con due parti:
1. **Studio di fattibilità** (`/`): 7 capitoli (mercato, tecnica, costi, architettura, legale, business, rischi/verdetto) con box "Dato verificato" (fonte+data) / "Stima", tabelle, grafici recharts e calcolatore interattivo (`frontend/src/lib/economics.ts` è l'unica fonte dei numeri).
2. **Prototipo** (`/prototipo`), utente singolo, nessun login. Tab: Scontrino, Dispensa, Linea del tempo, Ricette, Mattino + pulsante Ricomincia.

## Flussi
- Scontrino: foto (ridotta a JPEG ≤1600px nel browser, non salvata) o testo incollato → `POST /api/receipts/parse` (Claude `claude-sonnet-5-5` via EMERGENT_LLM_KEY) → schermata di conferma (nome, categoria, frigo/dispensa/freezer, scadenza vera facoltativa, includi/escludi) → `POST /api/pantry/confirm` (salva prodotti + memorizza alias abbreviazioni in `aliases`).
- Durata: `backend/lib/shelf_life.py` tabella categoria × luogo × aperto. Scadenza etichetta ha precedenza; se aperto vale la più vicina tra etichetta e giorni dopo apertura. Urgenza: rosso ≤2 g, giallo ≤5, verde oltre. "Oggi" = Europe/Rome (APP_TZ).
- Dispensa: `GET /api/pantry` (solo attivi, ordinati per giorni rimasti), `POST /api/pantry` (manuale), `PATCH /api/pantry/{id}` (status consumato/buttato, opened), `GET /api/pantry/stats`.
- Ricette: `GET /api/recipes/today`, `POST /api/recipes/generate` (3 ricette, sostituisce quelle di oggi), `POST /api/recipes/{id}/cook` {item_ids} → segna consumati.
- Mattino: `GET /api/summary`; Telegram `GET/PUT /api/settings/telegram`, `POST /api/telegram/send`; loop in background ogni 60 s invia all'ora impostata (default 07:30) se configurato.
- Ricomincia: `DELETE /api/pantry` svuota pantry + recipes, conserva aliases.
- `GET /api/categories`, `GET /api/aliases`, `DELETE /api/aliases/{key}`.

## Collezioni Mongo
pantry, aliases, recipes, settings (key="telegram").

## Nessun seed, nessuna credenziale (no login). Telegram spento finché l'utente non inserisce token + chat ID.
