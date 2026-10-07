// Modello economico unico: usato dalle tabelle dello studio e dal calcolatore interattivo.
// Tutti i numeri qui sono STIME, tranne i prezzi di listino dei modelli (fonti nello studio).

export interface ModelPrice {
  key: string;
  label: string;
  inUsd: number; // $ per milione di token in ingresso
  outUsd: number; // $ per milione di token in uscita
}

export const MODELS: ModelPrice[] = [
  { key: "sonnet", label: "Claude Sonnet (usato nel prototipo)", inUsd: 2, outUsd: 10 },
  { key: "flash", label: "Gemini Flash (alternativa economica)", inUsd: 0.75, outUsd: 3.75 },
];

export const USD_EUR = 0.86; // stima del cambio
export const VAT = 0.22; // IVA italiana sui servizi digitali
export const STORE_FEE = 0.15; // Apple Small Business / Google abbonamenti

// Token stimati per operazione (misurati a grandi linee sul prototipo)
export const TOKENS = {
  receipt: { in: 3400, out: 1200 }, // foto ~2.500 token + istruzioni; ~25 righe in uscita
  recipes: { in: 1800, out: 1500 }, // elenco dispensa + 3 ricette complete
};

export function opCostEur(m: ModelPrice, t: { in: number; out: number }) {
  return ((t.in * m.inUsd + t.out * m.outUsd) / 1_000_000) * USD_EUR;
}

export function hostingEur(users: number) {
  if (users <= 100) return 10;
  if (users <= 1000) return 45;
  if (users <= 10000) return 250;
  return 250 + (users - 10000) * 0.02;
}

export interface Params {
  users: number;
  receiptsPerMonth: number;
  recipeGensPerDay: number;
  activeShare: number; // quota di utenti che apre l'app e genera ricette in un giorno
  priceMonthly: number;
  payingShare: number; // % utenti paganti
  freeUsageShare: number; // quanto consuma un utente gratuito rispetto a un pagante
  fixedMonthly: number; // costi fissi: account store, dominio, strumenti
  modelKey: string;
}

export const DEFAULTS: Params = {
  users: 1000,
  receiptsPerMonth: 8,
  recipeGensPerDay: 1,
  activeShare: 0.6,
  priceMonthly: 2.99,
  payingShare: 0.05,
  freeUsageShare: 0.25,
  fixedMonthly: 30,
  modelKey: "sonnet",
};

export function aiPerPayingUser(p: Params) {
  const m = MODELS.find((x) => x.key === p.modelKey) ?? MODELS[0];
  const receipts = p.receiptsPerMonth * opCostEur(m, TOKENS.receipt);
  const recipes = 30 * p.activeShare * p.recipeGensPerDay * opCostEur(m, TOKENS.recipes);
  return { receipts, recipes, total: receipts + recipes };
}

export function netPerSubscriber(price: number) {
  return (price / (1 + VAT)) * (1 - STORE_FEE);
}

export function monthly(p: Params) {
  const paying = Math.round(p.users * p.payingShare);
  const free = p.users - paying;
  const perUser = aiPerPayingUser(p).total;
  const ai = paying * perUser + free * perUser * p.freeUsageShare;
  const hosting = hostingEur(p.users);
  const costs = ai + hosting + p.fixedMonthly;
  const revenue = paying * netPerSubscriber(p.priceMonthly);
  return { paying, free, ai, hosting, fixed: p.fixedMonthly, costs, revenue, margin: revenue - costs };
}

export function breakEvenUsers(p: Params): number | null {
  for (let u = 50; u <= 500_000; u = Math.ceil(u * 1.03)) {
    if (monthly({ ...p, users: u }).margin >= 0) return u;
  }
  return null;
}
