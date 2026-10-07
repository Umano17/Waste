import { useState } from "react";
import { toast } from "sonner";
import { Ban, Check, PackageOpen, Plus, Refrigerator, Snowflake, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddItem, useCategories, usePantry, useUpdateItem } from "@/lib/queries";
import type { PantryItem, Storage } from "@/lib/types";
import { STORAGE_LABEL, dateIt, daysLabel, errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";

export const URGENCY_STYLE = {
  rosso: { dot: "bg-[#DC2626]", chip: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]", label: "Usa subito" },
  giallo: { dot: "bg-[#D97706]", chip: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]", label: "Questa settimana" },
  verde: { dot: "bg-[#16A34A]", chip: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]", label: "Tranquillo" },
};

const STORAGE_ICON = { frigo: Refrigerator, dispensa: Warehouse, freezer: Snowflake };

export function ItemCard({ item }: { item: PantryItem }) {
  const upd = useUpdateItem();
  const u = URGENCY_STYLE[item.urgency];
  const Icon = STORAGE_ICON[item.storage];
  const act = (patch: Parameters<typeof upd.mutate>[0]["upd"], msg: string) =>
    upd.mutate({ id: item.id, upd: patch }, { onSuccess: () => toast.success(msg), onError: (e) => toast.error(errMsg(e)) });
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md" data-testid={`pantry-item-${item.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium leading-snug" data-testid="pantry-item-name">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.category_label}{item.quantity ? ` · ${item.quantity}` : ""}</div>
        </div>
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", u.chip)} data-testid="pantry-item-days-left">
          {daysLabel(item.days_left)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Icon className="size-3.5" />{STORAGE_LABEL[item.storage]}</span>
        <span>{item.opened ? "Aperto" : "Chiuso"}</span>
        <span data-testid="pantry-item-use-by">entro {dateIt(item.use_by)}</span>
        <span className="italic">{item.source === "etichetta" ? "da etichetta" : item.source === "stima_apertura" ? "stima dopo apertura" : "stima"}</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {!item.opened && (
          <Button size="xs" variant="outline" onClick={() => act({ opened: true }, `${item.name}: segnato come aperto`)} data-testid="pantry-item-open-button">
            <PackageOpen className="size-3.5" />Aperto
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={() => act({ status: "consumato" }, `${item.name}: consumato`)} data-testid="pantry-item-consume-button">
          <Check className="size-3.5" />Consumato
        </Button>
        <Button size="xs" variant="ghost" className="text-[#B91C1C]" onClick={() => act({ status: "buttato" }, `${item.name}: buttato`)} data-testid="pantry-item-throw-button">
          <Ban className="size-3.5" />Buttato
        </Button>
      </div>
    </div>
  );
}

function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("verdura");
  const [storage, setStorage] = useState<Storage>("frigo");
  const [expiry, setExpiry] = useState("");
  const [opened, setOpened] = useState(false);
  const add = useAddItem();
  const { data: cats = [] } = useCategories();
  const catLabel = Object.fromEntries(cats.map((c) => [c.key, c.label]));

  const submit = () =>
    add.mutate({ name, category, storage, expiry_date: expiry || null, opened }, {
      onSuccess: () => { toast.success(`${name} aggiunto`); setOpen(false); setName(""); setExpiry(""); setOpened(false); },
      onError: (e) => toast.error(errMsg(e)),
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" data-testid="pantry-add-button" />}>
        <Plus className="size-4" />Aggiungi a mano
      </DialogTrigger>
      <DialogContent data-testid="pantry-add-dialog">
        <DialogHeader><DialogTitle>Aggiungi un prodotto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="add-name">Nome</Label>
            <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Zucchine" data-testid="add-name-input" />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v: string) => { setCategory(v); const c = cats.find((x) => x.key === v); if (c) setStorage(c.default_storage); }}>
              <SelectTrigger className="w-full" data-testid="add-category-select"><SelectValue>{(v) => catLabel[v as string] ?? (v as string)}</SelectValue></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-1" role="radiogroup" aria-label="Dove lo conservi">
            {(["frigo", "dispensa", "freezer"] as Storage[]).map((s) => (
              <button key={s} type="button" onClick={() => setStorage(s)}
                className={cn("flex-1 rounded-lg border px-2 py-2 text-sm transition-colors duration-150", storage === s ? "border-leaf bg-leaf text-white" : "border-border hover:bg-accent")}
                data-testid={`add-storage-${s}`}>{STORAGE_LABEL[s]}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-expiry">Scadenza (facoltativa)</Label>
              <Input id="add-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} data-testid="add-expiry-input" />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input type="checkbox" checked={opened} onChange={(e) => setOpened(e.target.checked)} className="size-4 accent-[#1E7B4D]" data-testid="add-opened-checkbox" />
              Già aperto
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || add.isPending} data-testid="add-submit-button">Aggiungi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PantryList() {
  const { data: items = [], isError, isLoading } = usePantry();
  const [filter, setFilter] = useState<"tutti" | Storage>("tutti");
  const shown = filter === "tutti" ? items : items.filter((i) => i.storage === filter);
  return (
    <div className="space-y-4" data-testid="pantry-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(["tutti", "frigo", "dispensa", "freezer"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn("rounded-full px-3 py-1.5 text-sm transition-colors duration-150", filter === f ? "bg-forest text-white" : "hover:bg-accent")}
              data-testid={`pantry-filter-${f}`}>
              {f === "tutti" ? `Tutti (${items.length})` : STORAGE_LABEL[f]}
            </button>
          ))}
        </div>
        <AddItemDialog />
      </div>
      {isError && <p className="text-sm text-muted-foreground" data-testid="pantry-error">Dispensa non disponibile al momento (server non raggiungibile).</p>}
      {!isError && !isLoading && shown.length === 0 && (
        <div className="rounded-2xl border border-dashed border-input p-10 text-center text-muted-foreground" data-testid="pantry-empty">
          La dispensa è vuota. Parti da uno scontrino o aggiungi un prodotto a mano.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((i) => <ItemCard key={i.id} item={i} />)}
      </div>
      <p className="text-xs text-muted-foreground">Le durate sono stime indicative. Controlla sempre etichetta, odore e aspetto; in caso di dubbio non consumare.</p>
    </div>
  );
}
