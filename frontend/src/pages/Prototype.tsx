import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChefHat, ListChecks, RotateCcw, ScanLine, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReceiptScan from "@/components/prototype/ReceiptScan";
import PantryList from "@/components/prototype/PantryList";
import Timeline from "@/components/prototype/Timeline";
import Recipes from "@/components/prototype/Recipes";
import Morning from "@/components/prototype/Morning";
import { useReset, useStats } from "@/lib/queries";
import { errMsg } from "@/lib/format";

function ResetButton() {
  const [open, setOpen] = useState(false);
  const reset = useReset();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2]" data-testid="reset-button" />}>
        <RotateCcw className="size-4" />Ricomincia
      </DialogTrigger>
      <DialogContent data-testid="reset-dialog">
        <DialogHeader>
          <DialogTitle>Ricominciare da zero?</DialogTitle>
          <DialogDescription>
            Svuoto la dispensa e le ricette di oggi, così riparti dal prossimo scontrino senza fare l'inventario. Le abbreviazioni che ho imparato restano.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" data-testid="reset-cancel-button" />}>Annulla</DialogClose>
          <Button
            className="bg-[#B91C1C] hover:bg-[#991B1B]"
            disabled={reset.isPending}
            onClick={() => reset.mutate(undefined, {
              onSuccess: (r) => { toast.success(`Dispensa svuotata (${r.removed} prodotti). Abbreviazioni conservate: ${r.aliases_kept}`); setOpen(false); },
              onError: (e) => toast.error(errMsg(e)),
            })}
            data-testid="reset-confirm-button"
          >Sì, svuota</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TABS = [
  { v: "scontrino", label: "Scontrino", icon: ScanLine },
  { v: "dispensa", label: "Dispensa", icon: ListChecks },
  { v: "tempo", label: "Linea del tempo", icon: CalendarClock },
  { v: "ricette", label: "Ricette", icon: ChefHat },
  { v: "mattino", label: "Mattino", icon: Sunrise },
];

export default function Prototype() {
  const [tab, setTab] = useState("scontrino");
  const { data: stats } = useStats();
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-24 sm:px-6" data-testid="prototype-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-leaf">Prototipo · fase 1</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">La tua dispensa</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm" data-testid="prototype-stats">
            <span className="rounded-full bg-accent px-3 py-1">{stats?.active ?? 0} in dispensa</span>
            <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-[#991B1B]" data-testid="stats-urgent">{stats?.urgent ?? 0} da usare subito</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">{stats?.consumed ?? 0} consumati · {stats?.thrown ?? 0} buttati</span>
          </div>
        </div>
        <ResetButton />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-secondary p-1 sm:w-auto">
          {TABS.map(({ v, label, icon: I }) => (
            <TabsTrigger key={v} value={v} className="gap-1.5 px-3 py-2" data-testid={`tab-${v}`}><I className="size-4" />{label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="scontrino" className="pt-4"><ReceiptScan onDone={() => setTab("tempo")} /></TabsContent>
        <TabsContent value="dispensa" className="pt-4"><PantryList /></TabsContent>
        <TabsContent value="tempo" className="pt-4"><Timeline /></TabsContent>
        <TabsContent value="ricette" className="pt-4"><Recipes /></TabsContent>
        <TabsContent value="mattino" className="pt-4"><Morning /></TabsContent>
      </Tabs>
    </main>
  );
}
