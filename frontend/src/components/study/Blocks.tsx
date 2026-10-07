import type { ReactNode } from "react";
import { BadgeCheck, Calculator, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "verificato" | "stima" | "attenzione";

const STYLES: Record<Kind, { box: string; label: string; icon: typeof BadgeCheck; title: string }> = {
  verificato: { box: "bg-[#ECFDF5] text-[#064E3B] border-[#A7F3D0]", label: "text-[#047857]", icon: BadgeCheck, title: "Dato verificato" },
  stima: { box: "bg-[#FFFBEB] text-[#78350F] border-[#FDE68A]", label: "text-[#B45309]", icon: Calculator, title: "Stima" },
  attenzione: { box: "bg-[#FEF2F2] text-[#7F1D1D] border-[#FECACA]", label: "text-[#B91C1C]", icon: TriangleAlert, title: "Attenzione" },
};

export function Callout({
  kind, children, source, testId,
}: { kind: Kind; children: ReactNode; source?: ReactNode; testId?: string }) {
  const s = STYLES[kind];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-xl border p-4 text-[15px] leading-relaxed", s.box)} data-testid={testId ?? `callout-${kind}`}>
      <div className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]", s.label)}>
        <Icon className="size-4" aria-hidden /> {s.title}
      </div>
      <div className="space-y-2">{children}</div>
      {source && <div className={cn("mt-2 text-xs", s.label)}>Fonte: {source}</div>}
    </div>
  );
}

export function Src({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
      {children}
    </a>
  );
}

export function Section({
  id, n, title, intro, children,
}: { id: string; n: number; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5" data-testid={`study-section-${id}`}>
      <div className="space-y-2 border-b border-border pb-4">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-leaf">Capitolo {n}</div>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-[34px]">{title}</h2>
        <p className="max-w-3xl text-[17px] leading-relaxed text-muted-foreground">{intro}</p>
      </div>
      {children}
    </section>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-xl font-semibold tracking-tight">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl text-[16px] leading-relaxed text-foreground/90">{children}</p>;
}

export function SimpleTable({ head, rows, testId }: { head: string[]; rows: ReactNode[][]; testId: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card" data-testid={testId}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top transition-colors duration-150 hover:bg-accent/50">
              {r.map((c, j) => <td key={j} className={cn("px-3 py-2.5", j === 0 && "font-medium")}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
