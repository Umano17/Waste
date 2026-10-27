# Caso studio · Dispensa

> App personale per non buttare cibo: dallo scontrino alla dispensa digitale, con scadenze stimate e ricette che usano per primo quello che sta per scadere.

| | |
|---|---|
| **Ruolo** | Ideazione, sviluppo e test (progetto personale) |
| **Periodo** | Ottobre 2026 |
| **Stato** | v1 completata e in uso quotidiano sull'iPhone |
| **Codice** | ~1.000 righe di Python, una pagina HTML, 40 test |

## Il problema

In casa si compra, si dimentica e si butta: la mozzarella in fondo al frigo, la seconda confezione di yogurt, le zucchine comprate per una ricetta mai fatta.
Le app esistenti chiedono di inserire ogni prodotto a mano, e dopo una settimana si smette.

Volevo uno strumento che:
- si riempisse **da solo**, partendo dallo scontrino;
- dicesse **cosa usare per primo**, anche quando sull'etichetta la data non c'è (frutta, verdura, pane);
- trasformasse le scadenze in **ricette** concrete;
- restasse **privato**: i dati di casa sul mio Mac, non sul server di qualcun altro.

## La soluzione

1. **Scontrino → dispensa.** Fotografo lo scontrino e Claude (API Anthropic) traduce le righe abbreviate («MOZZ.FDL 125G» → «Mozzarella fior di latte, 125 g, ×2»). Confermo o correggo; le correzioni vengono ricordate per gli scontrini successivi.
2. **Scadenze stimate.** Una tabella categoria × luogo × aperto/chiuso, basata su fonti pubbliche (USDA FoodKeeper, EFSA, Ministero della Salute), dà una data anche ai prodotti senza etichetta. Una linea del tempo colora i prodotti in rosso, giallo o verde.
3. **Uso reale della dispensa.** Pezzi uguali gestiti come blocco (uso 4 zucchine su 8, apro 1 mozzarella su 2 e solo quella "corre"), scadenza modificabile, annulla e cestino di 14 giorni per gli errori.
4. **Ricette del giorno.** Tre ricette mediterranee che usano prima gli ingredienti in scadenza; «L'ho cucinata» li toglie dalla dispensa.
5. **Sempre a portata, ma privata.** Il server gira sul Mac di casa (avvio automatico, fascia oraria 9–20) e si apre dall'iPhone come un'app tramite la rete privata Tailscale, con PIN.

![Dispensa sull'iPhone](schermata.png)

## Scelte tecniche e perché

| Scelta | Alternativa scartata | Motivo |
|---|---|---|
| Flask + file JSON | FastAPI + MongoDB (prima versione) | Un solo utente e poche centinaia di prodotti: un database era peso inutile. I JSON si leggono a occhio e si copiano come backup. |
| Una pagina HTML senza framework | React + build | Niente Node, niente bundler: si modifica e si ricarica. |
| Server solo su `127.0.0.1` + Tailscale + PIN | App pubblica su Internet | Nessuna porta aperta; anche dentro la rete serve il PIN, con blocco dopo 5 errori. |
| Claude solo dove serve (scontrini, ricette) | IA anche per scadenze e tipo prodotto | Le durate vengono da una tabella con fonti, il tipo da regole sul nome: gratis, istantaneo e testabile. |
| LaunchAgent di macOS | Avvio a mano | Parte all'accesso e si rialza da sola se si blocca. |

## Tecnologie

Python 3.11 · Flask · Anthropic SDK (Claude) · HTML/CSS/JS · Tailscale · launchd · pytest · GitHub Actions

## Come l'ho verificata

- **40 test automatici** (pytest) su durate, urgenze, pezzi, cestino, ricette, controllo d'ingresso, protezione CSRF e fascia oraria. Claude è simulato nei test, quindi girano gratis a ogni push su GitHub Actions.
- **Uso quotidiano** sull'iPhone: i problemi veri (quantità, frutta che non si "apre", tipo da scegliere a mano) sono venuti fuori usandola e sono diventati correzioni con il loro test.

## Il percorso

1. **Studio di fattibilità** con prototipo React + FastAPI generato con un builder IA (conservato nel ramo `emergent-v0`).
2. **Reparto di Jarvis**, il mio assistente personale in Python: è lì che l'ho usata davvero.
3. **App autonoma** (questa): staccata da Jarvis, con server proprio, PIN, test, avvio automatico e un'interfaccia curata (tema scuro, schede in vetro, foto di sfondo che cambia ogni settimana).

## Limiti e prossimi passi

- Oggi è per **una sola casa** e funziona finché il Mac è acceso.
- **v2 (idea):** versione per più persone con i dati salvati sul telefono di ciascuno, un piccolo server online solo per le chiamate a Claude (con tetto di spesa per utente) e statistiche d'uso anonime.

## Cosa ho imparato

- **Meno è meglio:** la prima versione aveva database, framework e build; quella che uso ogni giorno ha file JSON e una pagina sola. Scegliere lo strumento in base al problema, non alla moda.
- **Sicurezza pratica:** controlli `Host`/`Origin` contro richieste da altri siti, PIN con cookie firmato e blocco dei tentativi, chiavi solo in `.env`, mai su GitHub.
- **Test come rete di sicurezza:** ogni correzione nata dall'uso reale ha il suo test, così non torna indietro.
- **L'IA come componente, non come scorciatoia:** Claude dove serve davvero (leggere uno scontrino), regole semplici e verificabili dove bastano.
- **Git e GitHub:** commit chiari, storia ripulita da dati personali, CI che controlla ogni push.
