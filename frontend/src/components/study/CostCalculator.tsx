import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULTS, MODELS, aiPerPayingUser, breakEvenUsers, monthly, netPerSubscriber, type Params } from "@/lib/economics";
import { eur, num } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ id, label, hint, value, min, max, step, format, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <span className="font-mono text-sm font-semibold text-leaf" data-testid={`${id}-value`}>{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[#1E7B4D]"
        data-testid={`${id}-slider`}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const USER_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];

export default function CostCalculator() {
  const [p, setP] = useState<Params>(DEFAULTS);
  const set = <K extends keyof Params>(k: K, v: Params[K]) => setP((old) => ({ ...old, [k]: v }));
  const m = useMemo(() => monthly(p), [p]);
  const be = useMemo(() => breakEvenUsers(p), [p]);
  const perUser = aiPerPayingUser(p);
  const userIdx = Math.max(0, USER_STEPS.findIndex((u) => u >= p.users));

  const chart = [
    { name: "Costi", AI: Math.round(m.ai), Hosting: Math.round(m.hosting), Fissi: Math.round(m.fixed), Ricavi: 0 },
    { name: "Ricavi netti", AI: 0, Hosting: 0, Fissi: 0, Ricavi: Math.round(m.revenue) },
  ];

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm md:grid-cols-2 md:p-6" data-testid="cost-calculator">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Modello AI">
          {MODELS.map((mo) => (
            <button
              key={mo.key}
              type="button"
              onClick={() => set("modelKey", mo.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                p.modelKey === mo.key ? "border-leaf bg-leaf text-white" : "border-border hover:bg-accent",
              )}
              data-testid={`calc-model-${mo.key}`}
            >
              {mo.label}
            </button>
          ))}
        </div>
        <Slider id="calc-users" label="Utenti totali" hint="Persone registrate (gratuite + paganti)" value={userIdx}
          min={0} max={USER_STEPS.length - 1} step={1} format={(i) => num(USER_STEPS[i])}
          onChange={(i) => set("users", USER_STEPS[i])} />
        <Slider id="calc-paying" label="Quota di paganti" hint="Benchmark freemium Europa occidentale: ~2%; con prova gratuita e paywall: 5–10%"
          value={p.payingShare} min={0.01} max={0.3} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set("payingShare", v)} />
        <Slider id="calc-price" label="Prezzo abbonamento (IVA inclusa)" hint="Concorrenti: da 0,67 €/mese (NoWaste annuale) a 4,99 €/mese"
          value={p.priceMonthly} min={0.99} max={6.99} step={0.5} format={(v) => `${eur(v)}/mese`} onChange={(v) => set("priceMonthly", v)} />
        <Slider id="calc-receipts" label="Scontrini al mese per utente" hint="Una spesa grande + qualche spesa piccola"
          value={p.receiptsPerMonth} min={1} max={20} step={1} format={num} onChange={(v) => set("receiptsPerMonth", v)} />
        <Slider id="calc-recipes" label="Generazioni di ricette al giorno" hint="Ogni generazione = 3 ricette"
          value={p.recipeGensPerDay} min={0.25} max={3} step={0.25} format={(v) => num(v)} onChange={(v) => set("recipeGensPerDay", v)} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="calc-fixed" className="text-sm">Costi fissi €/mese</Label>
            <Input id="calc-fixed" type="number" min={0} value={p.fixedMonthly}
              onChange={(e) => set("fixedMonthly", Math.max(0, Number(e.target.value)))} data-testid="calc-fixed-input" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="calc-active" className="text-sm">Utenti attivi al giorno %</Label>
            <Input id="calc-active" type="number" min={5} max={100} value={Math.round(p.activeShare * 100)}
              onChange={(e) => set("activeShare", Math.min(1, Math.max(0.05, Number(e.target.value) / 100)))} data-testid="calc-active-input" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Costo AI per utente attivo" value={`${eur(perUser.total)}/mese`} testId="calc-ai-per-user" />
          <Kpi label="Incasso netto per abbonato" value={`${eur(netPerSubscriber(p.priceMonthly))}/mese`} testId="calc-net-per-sub" />
          <Kpi label={`Costi totali (${num(m.paying)} paganti)`} value={eur(m.costs, 0)} testId="calc-costs" />
          <Kpi label="Ricavi netti" value={eur(m.revenue, 0)} testId="calc-revenue" />
        </div>
        <div
          className={cn("rounded-xl p-4", m.margin >= 0 ? "bg-[#ECFDF5] text-[#064E3B]" : "bg-[#FEF2F2] text-[#7F1D1D]")}
          data-testid="calc-margin"
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em]">Margine mensile</div>
          <div className="font-heading text-3xl font-semibold">{eur(m.margin, 0)}</div>
          <div className="mt-1 text-sm" data-testid="calc-break-even">
            {be ? <>Punto di pareggio: circa <strong>{num(be)} utenti totali</strong> ({num(Math.round(be * p.payingShare))} paganti)</> : "Con questi parametri non si arriva al pareggio: alza prezzo o quota di paganti, o usa un modello più economico."}
          </div>
        </div>
        <div className="h-52" data-testid="calc-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E4" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(value: number) => eur(value, 0)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="AI" stackId="a" fill="#1E7B4D" />
              <Bar dataKey="Hosting" stackId="a" fill="#5A8F73" />
              <Bar dataKey="Fissi" stackId="a" fill="#B45309" />
              <Bar dataKey="Ricavi" stackId="a" fill="#D97706" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Tutte stime. Ricavi = prezzo − IVA 22% − commissione store 15%. Gli utenti gratuiti consumano il 25% dell'AI di un pagante (limiti sul piano gratuito).
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3" data-testid={testId}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-lg font-semibold">{value}</div>
    </div>
  );
}
