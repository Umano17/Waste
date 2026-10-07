import { Link } from "react-router-dom";
import { ArrowRight, Camera, ChefHat, Clock, Sunrise } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buttonVariants } from "@/components/ui/button";
import { Callout, H3, P, Section, SimpleTable, Src } from "@/components/study/Blocks";
import CostCalculator from "@/components/study/CostCalculator";
import { DEFAULTS, MODELS, TOKENS, aiPerPayingUser, breakEvenUsers, monthly, netPerSubscriber, opCostEur } from "@/lib/economics";
import { eur, num } from "@/lib/format";

const TOC = [
  { id: "sintesi", label: "In breve" },
  { id: "mercato", label: "1. Mercato e concorrenti" },
  { id: "tecnica", label: "2. Fattibilità tecnica" },
  { id: "costi", label: "3. Costi per utente" },
  { id: "architettura", label: "4. Architettura e crescita" },
  { id: "legale", label: "5. Aspetti legali" },
  { id: "business", label: "6. Modello di business" },
  { id: "verdetto", label: "7. Rischi, verdetto e piano" },
  { id: "fonti", label: "Fonti" },
];

const TIERS = [100, 1000, 10000];

function costRows() {
  return TIERS.flatMap((users) =>
    MODELS.map((mo) => {
      const m = monthly({ ...DEFAULTS, users, modelKey: mo.key });
      return [
        `${num(users)} utenti`,
        mo.key === "sonnet" ? "Claude Sonnet" : "Gemini Flash",
        eur(m.ai, 0),
        eur(m.hosting, 0),
        eur(m.fixed, 0),
        <strong key="t">{eur(m.costs, 0)}</strong>,
        eur(m.costs / users, 3),
        <span key="m" className={m.margin >= 0 ? "text-[#15803D]" : "text-[#B91C1C]"}>{eur(m.margin, 0)}</span>,
      ];
    }),
  );
}

const chartData = TIERS.map((users) => {
  const s = monthly({ ...DEFAULTS, users, modelKey: "sonnet" });
  const f = monthly({ ...DEFAULTS, users, modelKey: "flash" });
  return { name: `${num(users)} utenti`, "Costi con Sonnet": Math.round(s.costs), "Costi con Flash": Math.round(f.costs), "Ricavi netti": Math.round(s.revenue) };
});

export default function Study() {
  const sonnet = MODELS[0];
  const flash = MODELS[1];
  const personal = aiPerPayingUser({ ...DEFAULTS, activeShare: 1 });
  const be5 = breakEvenUsers(DEFAULTS);
  const beFlash = breakEvenUsers({ ...DEFAULTS, modelKey: "flash" });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6" data-testid="study-page">
      {/* HERO */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#112017_0%,#1B3526_100%)] text-white" data-testid="study-hero">
        <img
          src="https://images.unsplash.com/photo-1592178036182-5400889dfc74?crop=entropy&cs=srgb&fm=jpg&q=80&w=1600"
          alt="Barattoli in vetro in una dispensa"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8 animate-rise">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#A7C4B2]">Studio di fattibilità · ottobre 2026</div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Fotografi lo scontrino.<br />L'app ti dice cosa cucinare prima che vada sprecato.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#D6E4DB]">
              Analisi completa — mercato, tecnica, costi, legge, guadagni e rischi — spiegata in modo semplice, con ogni numero
              marcato come <span className="rounded bg-[#ECFDF5] px-1.5 text-[#064E3B]">verificato</span> (con fonte e data) oppure come
              <span className="ml-1 rounded bg-[#FFFBEB] px-1.5 text-[#78350F]">stima</span> (con il ragionamento).
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/prototipo" className={buttonVariants({ size: "lg", className: "bg-white !text-[#14241B] hover:bg-[#ECFDF5]" })} data-testid="hero-open-prototype-button">
                Prova il prototipo <ArrowRight className="size-4" />
              </Link>
              <a href="#verdetto" className={buttonVariants({ size: "lg", variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })} data-testid="hero-verdict-link">
                Vai al verdetto
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end lg:col-span-4">
            {[
              { icon: Camera, t: "Scontrino", d: "foto → prodotti" },
              { icon: Clock, t: "Linea del tempo", d: "chi scade prima" },
              { icon: ChefHat, t: "Ricette", d: "usa il più urgente" },
              { icon: Sunrise, t: "Avviso", d: "ogni mattina" },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <I className="mb-2 size-5 text-[#86EFAC]" aria-hidden />
                <div className="font-medium">{t}</div>
                <div className="text-sm text-[#A7C4B2]">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
        {/* TOC */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20" data-testid="study-toc">
          <nav className="rounded-2xl border border-border bg-sidebar p-4" aria-label="Indice dello studio">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Indice</div>
            <ol className="flex gap-1 overflow-x-auto lg:flex-col">
              {TOC.map((t) => (
                <li key={t.id} className="shrink-0">
                  <a href={`#${t.id}`} className="block rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-sidebar-accent" data-testid={`toc-link-${t.id}`}>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="space-y-16 lg:col-span-9">
          {/* SINTESI */}
          <section id="sintesi" className="scroll-mt-24 space-y-4" data-testid="study-section-sintesi">
            <h2 className="text-3xl font-semibold tracking-tight">In breve (per chi ha 2 minuti)</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
                <ul className="space-y-3 text-[16px] leading-relaxed">
                  <li><strong>Il problema esiste e costa:</strong> in Italia ogni persona butta circa mezzo chilo di cibo a settimana; lo spreco domestico vale miliardi di euro l'anno.</li>
                  <li><strong>La tecnologia c'è:</strong> i modelli AI leggono bene gli scontrini italiani, ma non perfettamente — per questo serve la schermata di conferma, che il prototipo già ha.</li>
                  <li><strong>Costa poco per te:</strong> uso personale ≈ <strong>{eur(personal.total)}/mese</strong> di AI (stima).</li>
                  <li><strong>Come business è possibile ma stretto:</strong> diverse app simili hanno chiuso o sono state assorbite. Si regge solo con prova gratuita + abbonamento, costi AI tenuti bassi e utenti che restano.</li>
                  <li><strong>Consiglio:</strong> usalo tu per 4–6 settimane, poi 20–50 tester; si paga lo sviluppo dell'app nativa solo se si superano soglie precise (capitolo 7).</li>
                </ul>
              </div>
              <div className="rounded-2xl bg-forest p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9EB3A6]">Verdetto</div>
                <div className="mt-2 font-heading text-2xl font-semibold leading-snug">Sì al prototipo personale. Sì condizionato all'app a pagamento.</div>
                <p className="mt-3 text-sm text-[#D6E4DB]">Il valore vero non è "leggere lo scontrino" (lo fanno già in altri), ma la combinazione scontrino italiano + durata dopo apertura + ricette del giorno + avviso.</p>
              </div>
            </div>
          </section>

          {/* 1 MERCATO */}
          <Section id="mercato" n={1} title="Mercato e concorrenti" intro="Quanto è grande il problema, chi c'è già, quanto costa, cosa dicono gli utenti e dove resta uno spazio libero.">
            <H3>Quanto cibo si spreca in casa</H3>
            <div className="grid gap-4 md:grid-cols-2">
              <Callout kind="verificato" source={<><Src href="https://www.ansa.it/sito/notizie/economia/2026/09/29/lo-spreco-alimentare-a-casa-vale-66-miliardi-ma-volumi-giu-dell11-in-un-anno_571d742b-c12c-4bc0-af12-ac64e3f2cbaf.html">ANSA, 29/09/2026</Src> — dati Waste Watcher International / Università di Bologna</>}>
                <p>Spreco domestico in Italia: <strong>493,7 g a persona a settimana</strong> (−11% in un anno). Valore: <strong>6,6 miliardi €/anno</strong>. Obiettivo ONU 2030: 369,7 g.</p>
              </Callout>
              <Callout kind="verificato" source={<><Src href="https://www.ansa.it/sito/notizie/economia/2026/02/03/litalia-spreca-meno-cibo-ma-73-miliardi-euro-finiscono-nella-spazzatura_aec0663b-c4c9-4712-86f0-6dc49f7c796e.html">ANSA, 03/02/2026</Src>; <Src href="https://www.sprecozero.it/wp-content/uploads/2026/04/Report-WW26_Febb.pdf">Report Waste Watcher feb. 2026</Src></>}>
                <p>A febbraio 2026: 554 g/settimana, 7,3 miliardi €. I cibi più buttati: <strong>frutta fresca, verdura fresca, pane</strong>. La Generazione Z spreca di più, spesso per "difficoltà organizzative".</p>
              </Callout>
            </div>
            <Callout kind="stima">
              <p>Tradotto: una famiglia di 3 persone butta circa 75–80 kg di cibo l'anno, cioè <strong>~300–400 € l'anno</strong> (dal dato 2025 di 130,71 €/persona, <Src href="https://www.ilfattoquotidiano.it/2025/02/04/frutta-pane-e-verdure-tutto-il-cibo-che-sprechiamo-vale-almeno-130-euro-a-testa-ogni-anno/7863389/">Il Fatto Quotidiano 04/02/2025</Src>). Un'app da 25 €/anno si "ripaga" se fa risparmiare anche solo il 10% di quello spreco: è l'argomento di vendita principale.</p>
            </Callout>

            <H3>Chi c'è già (Italia, Europa e grandi nomi presenti in Italia)</H3>
            <SimpleTable
              testId="competitor-table"
              head={["App", "Cosa fa", "Prezzo (verificato)", "Legge lo scontrino?", "Cosa le manca"]}
              rows={[
                ["Too Good To Go (DK)", "Mercato delle eccedenze dei negozi (Surprise Bag)", "Gratis; paghi le box", "No", "Non gestisce la dispensa di casa. 12 mln utenti registrati in Italia a fine 2025"],
                ["NoWaste (NL)", "Inventario manuale / codice a barre", "Pro 7,99 €/anno o 34,99 € a vita", "No", "Recensioni: scanner più preciso solo nella Pro; tutto a mano"],
                ["Dispensa Leggera (IT, 2025)", "Scadenze, piano pasti, budget", "4,99 €/mese · 12,99 €/trim. · 39,99 €/anno, prova 7 gg", "Non dichiarato", "Prezzo alto; nessuna stima di durata dopo apertura dichiarata"],
                ["Dispensina (IT)", "Scadenze, quantità, aperto/chiuso, avvisi", "Freemium", "No", "Inserimento manuale"],
                ["CozZo (IT)", "Dispensa e scadenze", "Chiusa: supporto fino al 30/12/2025", "—", "Segnale: difficile far pagare"],
                ["Kitche (UK)", "Scansione scontrini + ricette anti-spreco", "Era gratis (ricavi B2B)", "Sì (UK)", "Acquisita da Remy a feb. 2025 e ritirata dagli store"],
                ["Fango (FI)", "Scontrini con AI in 34 paesi, senza account", "da 2,99 $/mese, prova 1 mese", "Sì", "Generalista: non è tarata sulle abbreviazioni italiane né su ricette giornaliere"],
                ["KitchenPal", "Codice a barre + scontrino, famiglia", "3,99 $/mese o 14,99 $/anno", "Sì", "Poco localizzata per l'Italia"],
                ["Pantry Check (US)", "Inventario a codice a barre", "Gratis fino a 200 articoli, extra 1,99–29,99 $", "No", "Pensata per gli USA"],
                ["Mealime / Supercook", "Ricette da ingredienti / piani pasto", "Mealime Pro ~2,99 £/mese; Supercook gratis", "No", "Non sanno cosa sta per scadere"],
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Fonti prezzi (consultate ott. 2026): <Src href="https://apps.apple.com/it/app/nowaste-inventario-alimentare/id926211004">App Store NoWaste</Src> ·{" "}
              <Src href="https://apps.apple.com/it/app/dispensa-leggera/id6742057780">App Store Dispensa Leggera</Src> · <Src href="https://dispensina.app/">dispensina.app</Src> ·{" "}
              <Src href="https://cozzo.app/">cozzo.app</Src> · <Src href="https://fango.fi/en/blog/kitche-app-alternatives/">fango.fi</Src> ·{" "}
              <Src href="https://apps.apple.com/us/app/pantry-check-grocery-list/id966702368">App Store Pantry Check</Src> ·{" "}
              <Src href="https://www.agenfood.it/tecnologie/too-good-to-go-nel-2025-crescita-a-doppia-cifra-in-2-anni-duplicati-risultati-dei-5-precedenti/">Agenfood (TGTG)</Src>. I prezzi cambiano spesso: ricontrollali prima di decidere.
            </p>
            <Callout kind="stima" testId="callout-market-gap">
              <p><strong>Lo spazio libero (nostra analisi):</strong> nessuna delle app viste unisce insieme (1) lettura degli scontrini <em>italiani</em> con memoria delle abbreviazioni, (2) durata che cambia se il prodotto è aperto o chiuso e dove lo tieni, (3) ricette giornaliere che partono da ciò che scade prima, (4) un avviso al mattino. Le lamentele ricorrenti negli store sono: <em>"inserire tutto a mano è faticoso"</em> e <em>"dopo due settimane smetto di aggiornarla"</em>.</p>
              <p>Il secondo punto è il vero nemico: per questo il prototipo ha il pulsante <strong>Ricomincia</strong> (riparti dal prossimo scontrino invece di fare l'inventario).</p>
            </Callout>
            <Callout kind="attenzione">
              <p>Kitche ritirata e CozZo chiusa dicono una cosa chiara: <strong>molte persone scaricano queste app ma poche pagano</strong>. Il rischio non è tecnico, è di abitudine.</p>
            </Callout>
          </Section>

          {/* 2 TECNICA */}
          <Section id="tecnica" n={2} title="Fattibilità tecnica" intro="Le quattro cose che il software deve saper fare: leggere lo scontrino, stimare la durata, inventare ricette, avvisarti.">
            <H3>a) Lettura degli scontrini italiani</H3>
            <P>
              Il programma manda la foto a un modello AI "che vede" (Claude Sonnet). Il modello legge le righe e le traduce: <code className="rounded bg-muted px-1 font-mono text-sm">MOZZ.FDL 125G</code> → "Mozzarella fior di latte, 125 g, frigo".
            </P>
            <div className="grid gap-4 md:grid-cols-2">
              <Callout kind="verificato" source={<><Src href="https://receiptocr.ai/blog/how-accurate-is-receipt-ocr">receiptocr.ai</Src>; <Src href="https://arxiv.org/html/2605.22413">ReceiptBench, 2026</Src></>}>
                <p>Totale, data e negozio: letti correttamente nel <strong>95–98%</strong> dei casi. Le <strong>singole righe</strong> sono più difficili: i migliori modelli arrivano a un punteggio F1 di circa <strong>0,70–0,74</strong> (Gemini 3 Pro 0,737; GPT-5 0,708) su 10.000 scontrini.</p>
              </Callout>
              <Callout kind="stima">
                <p>Prova interna sul prototipo (1 scontrino Esselunga di test, 7 righe): <strong>7 su 7 interpretate correttamente</strong>, sacchetto riconosciuto come non alimentare, ~7 secondi. Un solo campione non è una statistica: serve una prova su 30–50 scontrini veri di catene diverse.</p>
              </Callout>
            </div>
            <P>
              Cosa fa sbagliare: scontrini termici sbiaditi, foto storte o piegate, abbreviazioni ambigue ("PROSC." crudo o cotto?). Soluzioni già nel prototipo: <strong>schermata di conferma</strong> con le righe incerte evidenziate, e <strong>memoria delle correzioni</strong> — la seconda volta che compri la stessa cosa nello stesso negozio, l'app la riconosce da sola.
            </P>

            <H3>b) Quanto dura un alimento: le tabelle</H3>
            <Callout kind="verificato" source={<><Src href="https://eur-lex.europa.eu/legal-content/IT/TXT/PDF/?uri=CELEX%3A32011R1169">Reg. UE 1169/2011, art. 24–25</Src>; <Src href="https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2020.6306">EFSA Journal 2020;18(12):6306</Src>; <Src href="https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json">USDA FoodKeeper</Src></>}>
              <p><strong>"Da consumarsi entro"</strong> = data di sicurezza: dopo, il cibo è considerato non sicuro. <strong>"Da consumarsi preferibilmente entro"</strong> = data di qualità: dopo, può essere ancora buono. Per i prodotti aperti, il produttore deve indicare "dopo l'apertura consumare entro…" quando serve.</p>
              <p>L'EFSA scrive esplicitamente che <strong>non è appropriato fissare limiti di tempo universali</strong>: ogni prodotto è diverso.</p>
            </Callout>
            <P>
              Per questo il prototipo usa una tabella prudente (categoria × frigo/dispensa/freezer × aperto/chiuso), costruita sui valori USDA FoodKeeper e sulle indicazioni EFSA, e la <strong>data vera dell'etichetta vince sempre</strong>. Quando apri un prodotto, vale la data più vicina tra etichetta e "giorni dopo l'apertura".
            </P>
            <SimpleTable
              testId="shelf-life-table"
              head={["Categoria (esempi)", "Frigo, chiuso", "Dispensa", "Freezer", "Dopo apertura"]}
              rows={[
                ["Latte fresco", "6 g", "sconsigliato", "3 mesi", "3 g"],
                ["Mozzarella, ricotta", "5 g", "sconsigliato", "2 mesi", "2 g"],
                ["Pollo, tacchino", "2 g", "sconsigliato", "9 mesi", "1 g"],
                ["Pesce fresco", "1 g", "sconsigliato", "3 mesi", "1 g"],
                ["Insalata in busta", "5 g", "1 g", "—", "2 g"],
                ["Salumi in vaschetta", "14 g", "sconsigliato", "2 mesi", "4 g"],
                ["Passata, legumi in scatola", "—", "1 anno", "—", "4 g (in frigo)"],
                ["Pasta, riso, farina", "—", "1 anno", "—", "6 mesi"],
              ]}
            />
            <Callout kind="stima"><p>Le durate sono stime prudenziali, non dati di sicurezza. L'app le mostra sempre con l'avvertenza "controlla etichetta, odore e aspetto".</p></Callout>

            <H3>c) Ricette</H3>
            <P>
              Ogni giorno il programma manda al modello la lista della dispensa ordinata per urgenza e chiede 3 ricette salutari (stile mediterraneo) che usino <strong>prima</strong> ciò che scade. Il risultato è buono e vario; i limiti sono due: l'AI può inventare quantità approssimative e <strong>non conosce gli allergeni reali</strong> dei prodotti (lo scontrino non li riporta). Soluzione: avvertenza visibile e, nell'app a pagamento, un profilo "cosa non posso mangiare" con filtro (vedi capitolo 5).
            </P>

            <H3>d) Avvisi al mattino</H3>
            <SimpleTable
              testId="notifications-table"
              head={["Fase", "Come arriva l'avviso", "Costo", "Note"]}
              rows={[
                ["Prototipo / Jarvis", "Bot Telegram (già lo usi)", "Gratis", "Pronto nel prototipo: basta inserire token del bot e chat ID"],
                ["Web app", "Notifiche Web Push", "Gratis", "Su iPhone funzionano solo se la web app è aggiunta alla schermata Home (iOS 16.4+, WebKit 2023)"],
                ["App nativa", "Notifiche push Apple (APNs) e Google (FCM)", "Gratis", "Le più affidabili; richiedono l'app negli store"],
              ]}
            />
          </Section>

          {/* 3 COSTI */}
          <Section id="costi" n={3} title="Costi per utente" intro="Quanto costa far funzionare il servizio: il modello AI (per scontrino e per ricetta), il server, il database, gli store.">
            <div className="grid gap-4 md:grid-cols-2">
              <Callout kind="verificato" source={<><Src href="https://platform.claude.com/docs/en/about-claude/pricing">Listino Anthropic</Src> (consultato ott. 2026)</>}>
                <p><strong>Claude Sonnet:</strong> {sonnet.inUsd} $ per milione di token letti, {sonnet.outUsd} $ per milione di token scritti. (Un "token" ≈ ¾ di parola.)</p>
              </Callout>
              <Callout kind="verificato" source={<><Src href="https://ai.google.dev/gemini-api/docs/pricing">Listino Google Gemini</Src> (consultato ott. 2026)</>}>
                <p><strong>Gemini Flash (3.7/3.8):</strong> {flash.inUsd} $ / {flash.outUsd} $ per milione fino al 31/12/2026; dal 1/1/2027 raddoppia a 1,50 $ / 7,50 $.</p>
              </Callout>
            </div>
            <SimpleTable
              testId="unit-cost-table"
              head={["Operazione", "Token (stima)", "Costo con Sonnet", "Costo con Flash"]}
              rows={[
                ["1 scontrino letto", `${num(TOKENS.receipt.in)} in · ${num(TOKENS.receipt.out)} out`, eur(opCostEur(sonnet, TOKENS.receipt), 3), eur(opCostEur(flash, TOKENS.receipt), 3)],
                ["3 ricette del giorno", `${num(TOKENS.recipes.in)} in · ${num(TOKENS.recipes.out)} out`, eur(opCostEur(sonnet, TOKENS.recipes), 3), eur(opCostEur(flash, TOKENS.recipes), 3)],
                ["Uso personale (8 scontrini + ricette ogni giorno)", "—", `${eur(personal.total)}/mese`, `${eur(aiPerPayingUser({ ...DEFAULTS, activeShare: 1, modelKey: "flash" }).total)}/mese`],
              ]}
            />
            <Callout kind="stima">
              <p>Ipotesi: cambio 1 $ = 0,86 €; 8 scontrini al mese; il 60% degli utenti apre l'app ogni giorno; il 5% paga; un utente gratuito consuma un quarto di un pagante (piano gratuito limitato); hosting da 10 €/mese (100 utenti) a 250 €/mese (10.000 utenti), con database gestito nell'UE; costi fissi 30 €/mese (account Apple 99 $/anno, dominio, posta, monitoraggio).</p>
            </Callout>
            <SimpleTable
              testId="tier-cost-table"
              head={["Utenti", "Modello", "AI/mese", "Hosting+DB", "Fissi", "Totale", "Per utente", "Margine a 2,99 €"]}
              rows={costRows()}
            />
            <div className="h-72 rounded-2xl border border-border bg-card p-4" data-testid="tier-cost-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(value: number) => eur(value, 0)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Costi con Sonnet" fill="#1E7B4D" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Costi con Flash" fill="#5A8F73" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Ricavi netti" fill="#D97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <P>
              La lezione: <strong>la voce che pesa sono le ricette, non gli scontrini</strong>, perché si generano ogni giorno. Tre leve per tagliare i costi del 60–80%: generare le ricette solo quando l'utente apre l'app (o una volta al mattino), usare un modello più economico per le ricette e tenere Sonnet per gli scontrini difficili, riutilizzare le ricette già create per dispense simili.
            </P>
            <H3>Calcolatore: prova tu i numeri</H3>
            <CostCalculator />
          </Section>

          {/* 4 ARCHITETTURA */}
          <Section id="architettura" n={4} title="Scalabilità e architettura" intro="Come passare dal programma sul tuo Mac a un'app negli store senza rifare tutto da capo.">
            <div className="grid gap-4 md:grid-cols-3" data-testid="architecture-phases">
              {[
                { t: "Fase 1 · Locale (Jarvis)", items: ["Modulo 'dispensa' dentro Jarvis (Python + Flask sul Mac)", "Database: un file SQLite", "Claude via la tua chiave API", "Avviso: bot Telegram alle 7:30", "Costo: ~1 €/mese"] },
                { t: "Fase 2 · Web app", items: ["Stesso codice Python su un server europeo", "Database gestito (PostgreSQL o MongoDB) nell'UE", "Login, privacy, cancellazione account", "Installabile come 'app' dalla schermata Home", "Notifiche Web Push + Telegram"] },
                { t: "Fase 3 · App nativa", items: ["App iPhone/Android (React Native/Expo o Flutter)", "Riusa lo stesso server della fase 2", "Abbonamenti via store (es. RevenueCat)", "Notifiche push native, fotocamera migliore", "Account sviluppatore: Apple 99 $/anno, Google 25 $ una tantum"] },
              ].map((ph, i) => (
                <div key={ph.t} className="rounded-2xl border border-border bg-card p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="font-mono text-xs text-leaf">0{i + 1}</div>
                  <div className="mt-1 font-heading text-lg font-semibold">{ph.t}</div>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-foreground/85">{ph.items.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ))}
            </div>
            <P>
              Il trucco è separare <strong>il cervello</strong> (le regole di durata, le istruzioni all'AI, la memoria delle abbreviazioni) dalla <strong>faccia</strong> (le schermate). Questo prototipo è già fatto così: il cervello è in Python ed è indipendente dalle schermate, quindi si può copiare dentro Jarvis (Flask) e, più avanti, servire sia la web app sia l'app nativa.
            </P>
            <Callout kind="stima">
              <p>Costo di sviluppo dell'app nativa (fase 3): <strong>8.000–25.000 €</strong> con un freelance esperto, <strong>25.000–60.000 €</strong> con un'agenzia, più 10–20% l'anno di manutenzione. Con strumenti di sviluppo assistito dall'AI la parte bassa della forchetta è realistica, perché il server esiste già.</p>
            </Callout>
          </Section>

          {/* 5 LEGALE */}
          <Section id="legale" n={5} title="Aspetti legali" intro="Non è consulenza legale: è la mappa dei punti da far controllare a un avvocato prima di vendere l'app.">
            <H3>Responsabilità sulle stime di durata</H3>
            <Callout kind="verificato" source={<><Src href="https://eur-lex.europa.eu/eli/dir/2024/2853/oj">Direttiva (UE) 2024/2853</Src>; Reg. UE 1169/2011 art. 24</>}>
              <p>La nuova direttiva europea sulla responsabilità per prodotti difettosi include esplicitamente il <strong>software</strong>; gli Stati devono recepirla entro il <strong>9 dicembre 2026</strong>. Un consiglio sbagliato che causa un danno potrebbe quindi essere contestato.</p>
            </Callout>
            <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li>Mai presentare la stima come data di sicurezza: l'etichetta "da consumarsi entro" ha sempre la precedenza (il prototipo lo fa già).</li>
              <li>Mai suggerire di consumare un prodotto oltre il "da consumarsi entro" dell'etichetta.</li>
              <li>Avvertenza fissa e visibile: <em>"Stima indicativa. Controlla sempre etichetta, odore e aspetto. In caso di dubbio non consumare."</em></li>
              <li>Termini d'uso con limitazione di responsabilità; stime prudenti (meglio sottostimare).</li>
            </ul>
            <H3>Privacy (GDPR): scontrini e abitudini alimentari</H3>
            <Callout kind="verificato" source={<><Src href="https://eur-lex.europa.eu/eli/reg/2016/679/oj">Reg. UE 2016/679 (GDPR), art. 9</Src></>}>
              <p>Allergie, intolleranze e diete legate alla salute sono <strong>dati sanitari</strong> (categoria particolare): serve il <strong>consenso esplicito</strong> dell'utente e misure di sicurezza rafforzate.</p>
            </Callout>
            <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li><strong>Lo scontrino contiene più di quanto sembri:</strong> negozio, ora, ultime cifre della carta e talvolta il <strong>codice fiscale</strong> (scontrino "parlante"). Regola: leggere la foto e <strong>non conservarla</strong> (il prototipo non salva le foto).</li>
              <li>Le abitudini d'acquisto possono rivelare salute, religione o stile di vita: trattarle come dati sensibili anche quando non lo sono per legge.</li>
              <li>Server nell'UE; contratto di trattamento dati (DPA) con il fornitore AI; trasferimenti verso gli USA coperti dal Data Privacy Framework UE-USA.</li>
              <li>Informativa chiara, registro dei trattamenti, possibilità di scaricare e cancellare tutto (Apple richiede la cancellazione dell'account dall'interno dell'app).</li>
              <li>Indicare che le ricette sono generate da un'AI (obblighi di trasparenza dell'AI Act europeo).</li>
            </ul>
            <H3>Allergeni</H3>
            <Callout kind="verificato" source={<><Src href="https://eur-lex.europa.eu/legal-content/IT/TXT/PDF/?uri=CELEX%3A32011R1169">Reg. UE 1169/2011, Allegato II</Src></>}>
              <p>I 14 allergeni da dichiarare: glutine, crostacei, uova, pesce, arachidi, soia, latte, frutta a guscio, sedano, senape, sesamo, solfiti, lupini, molluschi.</p>
            </Callout>
            <Callout kind="attenzione">
              <p>Lo scontrino <strong>non riporta gli allergeni</strong> e l'AI non può garantirli. L'app non deve mai dire "questa ricetta è sicura per celiaci/allergici". Può solo filtrare in base a quello che l'utente dichiara, con l'avviso "verifica sempre l'etichetta di ogni ingrediente".</p>
            </Callout>
          </Section>

          {/* 6 BUSINESS */}
          <Section id="business" n={6} title="Modello di business" intro="Gratis o a pagamento? Quanto chiedere? Quanti utenti servono per non perderci?">
            <Callout kind="verificato" source={<><Src href="https://www.revenuecat.com/state-of-subscription-apps/">RevenueCat, State of Subscription Apps 2025</Src></>}>
              <p>Dopo 35 giorni, le app con <strong>paywall</strong> (prova gratuita poi pagamento) convertono il <strong>10,7%</strong> dei download in paganti; le app <strong>freemium</strong> solo il <strong>2,1%</strong> (Europa occidentale: 2,0%). Dopo un anno la fidelizzazione dei due modelli tende ad allinearsi.</p>
            </Callout>
            <Callout kind="verificato" source={<><Src href="https://developer.apple.com/app-store/small-business-program/">Apple Small Business Program</Src>; <Src href="https://support.google.com/googleplay/android-developer/answer/16954621?hl=en-GB">Google Play, commissioni</Src></>}>
              <p>Apple trattiene il <strong>15%</strong> per chi incassa meno di 1 milione $/anno. Google Play: 10–15% sugli abbonamenti (regole in cambiamento nel 2026). Account sviluppatore Apple: 99 $/anno.</p>
            </Callout>
            <SimpleTable
              testId="pricing-options-table"
              head={["Opzione", "Come funziona", "Pro", "Contro"]}
              rows={[
                ["Solo gratis + pubblicità", "Ricavi da banner / partner", "Molti download", "Con costi AI per utente, la pubblicità non basta (stima)"],
                ["Freemium", "Dispensa manuale gratis, AI a pagamento", "Passaparola", "~2% paga: serve molto pubblico"],
                ["Prova 14 gg + abbonamento (consigliato)", "Tutto incluso per 14 giorni, poi 2,99 €/mese o 24,99 €/anno", "Conversione più alta; costi AI sotto controllo", "Meno download iniziali"],
                ["Una tantum", "Paghi una volta", "Semplice", "Insostenibile: l'AI costa ogni mese"],
              ]}
            />
            <Callout kind="stima" testId="callout-break-even">
              <p><strong>Prezzo sostenibile: 2,99 €/mese o 24,99 €/anno.</strong> Sotto i 4,99 € di Dispensa Leggera, sopra NoWaste (che però non ha AI). Ogni abbonato mensile porta in cassa circa <strong>{eur(netPerSubscriber(2.99))}</strong> (tolti IVA e store).</p>
              <p>Punto di pareggio con il 5% di paganti: circa <strong>{be5 ? num(be5) : "—"} utenti</strong> con Sonnet, <strong>{beFlash ? num(beFlash) : "—"}</strong> con Flash. Servono quindi qualche migliaio di utenti per coprire i costi di gestione, e molti di più per ripagare lo sviluppo dell'app nativa (es. 20.000 € ripagati in 2 anni = ~830 €/mese di margine aggiuntivo).</p>
            </Callout>
          </Section>

          {/* 7 VERDETTO */}
          <Section id="verdetto" n={7} title="Rischi principali, verdetto e piano" intro="Cosa può andare storto, se conviene, e cosa costruire per primo.">
            <SimpleTable
              testId="risks-table"
              head={["Rischio", "Probabilità", "Impatto", "Come ridurlo"]}
              rows={[
                ["Le persone smettono di aggiornare la dispensa", "Alta", "Alto", "Scontrino = unico gesto; 'Ricomincia'; ricette che segnano da sole gli ingredienti usati"],
                ["Righe dello scontrino lette male", "Media", "Medio", "Schermata di conferma + memoria abbreviazioni"],
                ["Pochi paganti", "Alta", "Alto", "Prova gratuita + paywall; validare con 20–50 tester prima di investire"],
                ["Costi AI che salgono (es. Flash raddoppia nel 2027)", "Media", "Medio", "Ricette in cache, modelli intercambiabili, limiti sul piano gratuito"],
                ["Stima sbagliata → intossicazione", "Bassa", "Molto alto", "Stime prudenti, etichetta prioritaria, avvertenze, assicurazione RC"],
                ["Supermercati con scontrino digitale e app proprie", "Media", "Alto", "Puntare su multi-negozio e su ricette/avvisi, non solo sull'inventario"],
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-forest p-6 text-white" data-testid="verdict-box">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9EB3A6]">Verdetto</div>
                <p className="mt-2 font-heading text-xl font-semibold leading-snug">Conviene costruirlo per te subito. Conviene farne un'app a pagamento solo se il test con utenti veri supera queste soglie:</p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#D6E4DB]">
                  <li>almeno 1 scontrino a settimana per persona dopo 30 giorni nel 30% dei tester;</li>
                  <li>righe corrette senza modifiche ≥ 85% dopo la memoria abbreviazioni;</li>
                  <li>costo AI per utente attivo ≤ 0,50 €/mese;</li>
                  <li>almeno 1 tester su 4 dichiara che pagherebbe 2,99 €/mese.</li>
                </ul>
              </div>
              <ol className="space-y-3" data-testid="phase-plan">
                {[
                  ["Settimane 1–6 · Tu", "Usa questo prototipo (o il modulo Jarvis) a ogni spesa. Misura: righe corrette, ricette cucinate, cibo buttato."],
                  ["Mesi 2–3 · 20–50 tester", "Web app installabile con login semplice, server UE, informativa privacy. Costo: < 50 €/mese."],
                  ["Mese 4 · Decisione", "Se le soglie sono superate: preventivi per l'app nativa, avvocato per termini e privacy, account store."],
                  ["Mesi 5–8 · App nativa", "iPhone + Android sullo stesso server, prova 14 giorni + abbonamento, lancio in Italia."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf font-mono text-sm text-white">{i + 1}</span>
                    <div><div className="font-medium">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div>
                  </li>
                ))}
              </ol>
            </div>
            <Callout kind="verificato">
              <p><strong>Il primo prototipo è già costruito</strong> ed è nella scheda "Prototipo": foto scontrino → conferma abbreviazioni → dispensa → linea del tempo → ricette del giorno → avviso del mattino (Telegram) → Ricomincia.</p>
              <Link to="/prototipo" className={buttonVariants({ className: "mt-2" })} data-testid="verdict-open-prototype-button">Apri il prototipo <ArrowRight className="size-4" /></Link>
            </Callout>
          </Section>

          {/* FONTI */}
          <section id="fonti" className="scroll-mt-24 space-y-3" data-testid="study-section-fonti">
            <h2 className="text-2xl font-semibold tracking-tight">Fonti (consultate a ottobre 2026)</h2>
            <ul className="grid gap-1.5 text-sm text-muted-foreground md:grid-cols-2">
              {[
                ["Waste Watcher / ANSA, 29/09/2026", "https://www.ansa.it/sito/notizie/economia/2026/09/29/lo-spreco-alimentare-a-casa-vale-66-miliardi-ma-volumi-giu-dell11-in-un-anno_571d742b-c12c-4bc0-af12-ac64e3f2cbaf.html"],
                ["Waste Watcher Report, febbraio 2026", "https://www.sprecozero.it/wp-content/uploads/2026/04/Report-WW26_Febb.pdf"],
                ["Reg. UE 1169/2011 (etichettatura, allergeni)", "https://eur-lex.europa.eu/legal-content/IT/TXT/PDF/?uri=CELEX%3A32011R1169"],
                ["EFSA, date marking guidance (2020)", "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2020.6306"],
                ["USDA FSIS FoodKeeper", "https://www.fsis.usda.gov/shared/data/EN/foodkeeper.json"],
                ["GDPR, Reg. UE 2016/679", "https://eur-lex.europa.eu/eli/reg/2016/679/oj"],
                ["Direttiva UE 2024/2853 (responsabilità prodotti)", "https://eur-lex.europa.eu/eli/dir/2024/2853/oj"],
                ["Prezzi Anthropic", "https://platform.claude.com/docs/en/about-claude/pricing"],
                ["Prezzi Google Gemini", "https://ai.google.dev/gemini-api/docs/pricing"],
                ["ReceiptBench 2026 (arXiv)", "https://arxiv.org/html/2605.22413"],
                ["RevenueCat, State of Subscription Apps", "https://www.revenuecat.com/state-of-subscription-apps/"],
                ["Apple Small Business Program", "https://developer.apple.com/app-store/small-business-program/"],
                ["Google Play, commissioni", "https://support.google.com/googleplay/android-developer/answer/16954621?hl=en-GB"],
                ["Too Good To Go Italia 2025 (Agenfood)", "https://www.agenfood.it/tecnologie/too-good-to-go-nel-2025-crescita-a-doppia-cifra-in-2-anni-duplicati-risultati-dei-5-precedenti/"],
              ].map(([t, h]) => <li key={h}>• <Src href={h}>{t}</Src></li>)}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
