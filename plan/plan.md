# Dispensa Intelligente — Studio di fattibilità + prototipo funzionante

## Che cos'è
Una web app con due parti: lo **studio di fattibilità completo** (pagina web leggibile da qualsiasi dispositivo) e un **prototipo vero** che legge la foto dello scontrino, riempie una dispensa digitale, stima quando consumare ogni prodotto e propone ogni giorno ricette salutari con gli ingredienti più vicini alla scadenza.

## Per chi è
- Per te, come primo utente: decidi se il progetto merita di diventare un'app a pagamento.
- Prototipo personale (un solo utente, nessun login), pensato per essere poi spostato come "reparto" di Jarvis (Python + Flask sul Mac).
- Tutto il testo è in italiano, scritto per un non esperto.

## Funzioni principali ed esperienza

### A. Studio di fattibilità (pagina web)
- Pagina lunga con **indice laterale** e le 7 sezioni richieste: mercato e concorrenti, fattibilità tecnica, costi per utente, architettura, aspetti legali, modello di business, rischi e verdetto con piano in fasi.
- Ogni dato è marcato con un box **"Dato verificato"** (con fonte e data) oppure **"Stima"** (con il ragionamento).
- Mercato: Italia + UK, Germania, Francia, Spagna + i grandi nomi globali presenti in Italia (es. Too Good To Go, NoWaste, Kitche, CozZo, Pantry Check, ecc.), con prezzi, voti negli store e cosa manca loro.
- Tabelle e grafici dei costi a 100 / 1.000 / 10.000 utenti (modello AI per scontrino e per ricetta, hosting, database, store).
- **Calcolatore interattivo**: cambi numero di utenti, scontrini al mese, ricette al giorno, prezzo dell'abbonamento → vedi costi mensili, margine e punto di pareggio.
- Costi del prototipo calcolati sui prezzi pubblici di Claude Sonnet, con il confronto con alternative più economiche (es. Gemini Flash) come stima.

### B. Prototipo funzionante
1. **Foto dello scontrino** → Claude Sonnet legge le righe e le trasforma in prodotti (nome, quantità, prezzo, categoria proposta).
2. **Schermata di conferma**: le abbreviazioni tipiche degli scontrini italiani (es. "MOZZ.FDL 125G") vengono mostrate con l'interpretazione proposta; puoi correggerle, scegliere frigo/dispensa/freezer, inserire la data di scadenza vera o scartare la riga. Le correzioni vengono ricordate per gli scontrini futuri.
3. **Dispensa digitale**: elenco dei prodotti con stato (chiuso/aperto), luogo di conservazione e "da consumare entro". Puoi segnare un prodotto come aperto, consumato o buttato, e aggiungere prodotti a mano.
4. **Linea del tempo**: vista cronologica dei prodotti ordinati per urgenza (verde / giallo / rosso). La stima usa una tabella di durate per categoria × luogo × aperto/chiuso basata su fonti serie (citate nello studio); **la data di scadenza vera, se inserita, ha sempre la precedenza**. Ogni stima riporta un'avvertenza chiara ("stima indicativa, controlla sempre l'aspetto e l'etichetta").
5. **Ricette del giorno**: ogni giorno 2–3 ricette salutari generate con Claude Sonnet che usano per primi gli ingredienti più vicini alla scadenza; puoi rigenerarle e segnare gli ingredienti usati.
6. **Avviso del mattino**: un riepilogo giornaliero ("da usare oggi" + ricette) visibile nell'app; l'invio su **Telegram** è predisposto e si attiva quando inserisci il token del bot e il tuo chat ID (che gestisci tu).
7. **Pulsante "Ricomincia"**: svuota la dispensa con un solo tocco (con conferma), così se hai mangiato senza aggiornare puoi ripartire dal prossimo scontrino invece di fare l'inventario. Le correzioni delle abbreviazioni imparate vengono conservate.

## Fase 1: cosa viene costruito ora
- Studio di fattibilità completo come pagina web, con fonti e date, box verificato/stima, grafici e calcolatore interattivo.
- Prototipo funzionante: foto scontrino → conferma abbreviazioni → dispensa → linea del tempo → ricette del giorno → riepilogo del mattino → pulsante Ricomincia.
- AI: **Claude Sonnet** (claude-sonnet-5-5) sia per la lettura degli scontrini sia per le ricette, tramite la chiave universale Emergent (sostituibile in seguito con la tua chiave Anthropic usata da Jarvis).
- Telegram predisposto ma spento finché non fornisci token e chat ID.
- Fuori da questa fase: account e login, pagamenti, app native iPhone/Android, pubblicazione sugli store, gestione di più utenti, allergeni personalizzati (trattati nello studio, non nel prototipo).
