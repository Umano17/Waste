import { useState } from "react";
import { toast } from "sonner";
import { ChefHat, Clock, HeartPulse, Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCook, useGenerateRecipes, usePantry, useRecipes } from "@/lib/queries";
import type { PantryItem, Recipe } from "@/lib/types";
import { daysLabel, errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";

function RecipeCard({ r, idx, pantry }: { r: Recipe; idx: number; pantry: Record<string, PantryItem> }) {
  const linked = r.ingredients.filter((g) => g.pantry_item_id && pantry[g.pantry_item_id]);
  const [sel, setSel] = useState<string[]>(linked.map((g) => g.pantry_item_id as string));
  const cook = useCook();
  const done = () =>
    cook.mutate({ id: r.id, req: { item_ids: sel } }, {
      onSuccess: () => toast.success(`Buon appetito! ${sel.length} ingredienti tolti dalla dispensa`),
      onError: (e) => toast.error(errMsg(e)),
    });
  return (
    <article className={cn("flex flex-col rounded-2xl border border-border bg-card p-5 animate-rise", r.cooked && "opacity-70")} style={{ animationDelay: `${idx * 80}ms` }} data-testid={`recipe-card-${idx}`}>
      <h3 className="text-xl font-semibold leading-snug" data-testid="recipe-title">{r.title}</h3>
      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="size-3.5" />{r.minutes} min</span>
        <span className="flex items-center gap-1"><Users className="size-3.5" />{r.servings} persone</span>
      </div>
      {r.why && <p className="mt-3 rounded-lg bg-[#FFFBEB] px-3 py-2 text-sm text-[#78350F]">{r.why}</p>}
      <div className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ingredienti</div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {r.ingredients.map((g, i) => {
          const p = g.pantry_item_id ? pantry[g.pantry_item_id] : undefined;
          return (
            <li key={i} className="flex items-center gap-2">
              {p && !r.cooked ? (
                <Checkbox checked={sel.includes(p.id)} onCheckedChange={(v) => setSel((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                  aria-label={`Usato: ${g.name}`} data-testid={`recipe-${idx}-ingredient-${i}-checkbox`} />
              ) : <span className="size-4" />}
              <span className={cn(p && "font-medium")}>{g.name}</span>
              {g.quantity && <span className="text-muted-foreground">· {g.quantity}</span>}
              {p && <span className="ml-auto text-[11px] text-[#B45309]">{daysLabel(p.days_left)}</span>}
            </li>
          );
        })}
      </ul>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-leaf" data-testid={`recipe-${idx}-steps-toggle`}>Procedimento</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </details>
      {r.health_notes && <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground"><HeartPulse className="size-3.5 shrink-0 text-leaf" />{r.health_notes}</p>}
      <div className="mt-auto pt-4">
        {r.cooked ? (
          <span className="text-sm font-medium text-[#15803D]" data-testid={`recipe-${idx}-cooked-label`}>Cucinata ✓</span>
        ) : (
          <Button onClick={done} disabled={cook.isPending} className="w-full" data-testid={`recipe-${idx}-cook-button`}>
            <ChefHat className="size-4" />L'ho cucinata ({sel.length} da togliere)
          </Button>
        )}
      </div>
    </article>
  );
}

export default function Recipes() {
  const { data: recipes = [], isError } = useRecipes();
  const { data: items = [] } = usePantry();
  const gen = useGenerateRecipes();
  const pantry = Object.fromEntries(items.map((i) => [i.id, i]));
  const run = () => gen.mutate(undefined, { onError: (e) => toast.error(errMsg(e)), onSuccess: (r) => toast.success(`${r.length} ricette pronte`) });

  return (
    <div className="space-y-5" data-testid="recipes">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Ricette salutari che usano per primi gli ingredienti più vicini alla scadenza. Generate da AI: controlla sempre allergeni ed etichette.
        </p>
        <Button onClick={run} disabled={gen.isPending || items.length === 0} data-testid="recipes-generate-button">
          {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {recipes.length ? "Rigenera" : "Genera le ricette di oggi"}
        </Button>
      </div>
      {gen.isPending && <p className="text-sm text-leaf" data-testid="recipes-loading">Lo chef sta pensando… (10–30 secondi)</p>}
      {!isError && recipes.length === 0 && !gen.isPending && (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center text-muted-foreground" data-testid="recipes-empty">
          {items.length ? "Nessuna ricetta ancora per oggi: premi il pulsante qui sopra." : "Prima riempi la dispensa con uno scontrino."}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {recipes.map((r, i) => <RecipeCard key={r.id} r={r} idx={i} pantry={pantry} />)}
      </div>
    </div>
  );
}
