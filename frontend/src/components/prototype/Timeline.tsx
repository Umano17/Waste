import { usePantry } from "@/lib/queries";
import { URGENCY_STYLE } from "@/components/prototype/PantryList";
import { STORAGE_LABEL, dateIt, daysLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PantryItem, Urgency } from "@/lib/types";

const GROUPS: { key: Urgency; title: string; hint: string }[] = [
  { key: "rosso", title: "Da usare subito", hint: "entro 2 giorni" },
  { key: "giallo", title: "Questa settimana", hint: "3–5 giorni" },
  { key: "verde", title: "Con calma", hint: "oltre 5 giorni" },
];

export default function Timeline() {
  const { data: items = [] } = usePantry();
  const max = Math.max(14, ...items.map((i) => Math.min(i.days_left, 60)));
  return (
    <div className="space-y-8" data-testid="timeline">
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center text-muted-foreground" data-testid="timeline-empty">
          Nessun prodotto: la linea del tempo si riempie dopo il primo scontrino.
        </div>
      )}
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.urgency === g.key);
        if (!list.length) return null;
        return (
          <div key={g.key} className="space-y-3" data-testid={`timeline-group-${g.key}`}>
            <div className="flex items-center gap-2">
              <span className={cn("size-3 rounded-full", URGENCY_STYLE[g.key].dot)} />
              <h3 className="text-lg font-semibold">{g.title}</h3>
              <span className="text-sm text-muted-foreground">· {g.hint} · {list.length}</span>
            </div>
            <ol className="relative space-y-2 border-l-2 border-border pl-5">
              {list.map((i) => <Row key={i.id} item={i} max={max} />)}
            </ol>
          </div>
        );
      })}
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Come calcolo: durata tipica per categoria e luogo (frigo/dispensa/freezer) dalla data della spesa; se lo apri vale la durata dopo apertura; se inserisci la scadenza dell'etichetta, quella ha la precedenza. Stime indicative.
        </p>
      )}
    </div>
  );
}

function Row({ item, max }: { item: PantryItem; max: number }) {
  const pct = Math.max(4, Math.min(100, (Math.max(item.days_left, 0) / max) * 100));
  const u = URGENCY_STYLE[item.urgency];
  return (
    <li className="relative" data-testid={`timeline-item-${item.id}`}>
      <span className={cn("absolute -left-[27px] top-3 size-3 rounded-full ring-4 ring-background", u.dot)} />
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium">{item.name}</span>
          <span className="text-sm text-muted-foreground">{daysLabel(item.days_left)} · {dateIt(item.use_by)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-[width] duration-500", u.dot)} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          {STORAGE_LABEL[item.storage]} · {item.opened ? "aperto" : "chiuso"} · {item.source === "etichetta" ? "scadenza da etichetta" : "stima"}
        </div>
      </div>
    </li>
  );
}
