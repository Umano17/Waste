import { ApiError } from "@/lib/api";

export const eur = (n: number, digits = 2) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const num = (n: number) => n.toLocaleString("it-IT");

export const dateIt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

export const STORAGE_LABEL: Record<string, string> = { frigo: "Frigo", dispensa: "Dispensa", freezer: "Freezer" };

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    return `Errore ${e.status}`;
  }
  return "Connessione al server non riuscita";
}

export function daysLabel(d: number): string {
  if (d < 0) return `scaduto da ${-d} g`;
  if (d === 0) return "oggi";
  if (d === 1) return "domani";
  return `tra ${d} giorni`;
}
