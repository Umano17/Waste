import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, FileText, Loader2, Sparkles, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useConfirm, useParseReceipt } from "@/lib/queries";
import type { ParsedLine, Storage } from "@/lib/types";
import { STORAGE_LABEL, errMsg, eur } from "@/lib/format";
import { cn } from "@/lib/utils";

const SAMPLE = `ESSELUNGA SPA - MILANO
MOZZ.FDL 125G        0,99
LATTE PS UHT 1L      1,19
PETTO POLLO BIO      5,49
INS.MISTA 150G       1,29
PASSATA POM.700G     0,89
BANANE BIO           1,85
RICOTTA VACC.250G    1,59
ZUCCHINE KG 0,620    1,42
PANE CASER.500G      1,90
YOG.GRECO 0% 170G    0,99
SACCHETTO BIO        0,02
TOTALE EURO         17,62`;

interface Row extends ParsedLine {
  keep: boolean;
  expiry: string;
}

async function fileToBase64Jpeg(file: File, maxSide = 1600): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ReceiptScan({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [store, setStore] = useState<string | null>(null);
  const parse = useParseReceipt();
  const confirm = useConfirm();
  const { data: cats = [] } = useCategories();
  const catLabel = Object.fromEntries(cats.map((c) => [c.key, c.label]));

  const run = (req: { image_base64?: string; text?: string }) =>
    parse.mutate(req, {
      onSuccess: (r) => {
        setRows(r.lines.map((l) => ({ ...l, keep: l.is_food, expiry: "" })));
        setPurchaseDate(r.purchase_date);
        setStore(r.store);
        if (!r.lines.length) toast.warning("Nessun prodotto trovato: prova con una foto più nitida");
      },
      onError: (e) => toast.error(errMsg(e)),
    });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    try {
      run({ image_base64: await fileToBase64Jpeg(f) });
    } catch {
      toast.error("Immagine non leggibile: usa JPG o PNG");
    }
  };

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r && r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = () => {
    if (!rows) return;
    const items = rows.filter((r) => r.keep && r.name.trim()).map((r) => ({
      name: r.name, raw_text: r.raw_text, category: r.category, storage: r.storage, quantity: r.quantity,
      price: r.price, purchase_date: purchaseDate, expiry_date: r.expiry || null,
    }));
    if (!items.length) return toast.warning("Seleziona almeno un prodotto");
    confirm.mutate({ items, remember: true }, {
      onSuccess: (res) => {
        toast.success(`${res.length} prodotti aggiunti alla dispensa`);
        setRows(null); setText(""); setPreview(null);
        onDone();
      },
      onError: (e) => toast.error(errMsg(e)),
    });
  };

  if (rows) {
    const kept = rows.filter((r) => r.keep).length;
    return (
      <div className="space-y-4 animate-rise" data-testid="confirm-screen">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Controlla cosa ho capito</h3>
            <p className="text-sm text-muted-foreground">
              {store ? `${store} · ` : ""}{rows.length} righe lette. Le righe <span className="font-medium text-[#B45309]">gialle</span> sono incerte: correggi il nome se serve. Le correzioni vengono ricordate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="purchase-date" className="text-sm text-muted-foreground">Data spesa</label>
            <Input id="purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-40" data-testid="confirm-purchase-date-input" />
          </div>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={`${r.raw_text}-${i}`}
              className={cn(
                "grid gap-3 rounded-xl border bg-card p-3 transition-opacity duration-200 md:grid-cols-12 md:items-center",
                !r.keep && "opacity-50",
                r.confidence === "bassa" && r.keep ? "border-[#FDE68A] bg-[#FFFBEB]" : "border-border",
              )}
              data-testid={`confirm-row-${i}`}
            >
              <div className="flex items-start gap-2 md:col-span-3">
                <Checkbox checked={r.keep} onCheckedChange={(v) => update(i, { keep: Boolean(v) })} aria-label="Includi" data-testid={`confirm-row-${i}-keep-checkbox`} className="mt-1" />
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-muted-foreground" title={r.raw_text} data-testid={`confirm-row-${i}-raw`}>{r.raw_text}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {r.from_memory && <Badge variant="secondary" className="text-[10px]">ricordato</Badge>}
                    {!r.is_food && <Badge variant="outline" className="text-[10px]">non alimentare</Badge>}
                    {r.confidence === "bassa" && <Badge className="bg-[#D97706] text-[10px]">incerto</Badge>}
                    {r.price != null && <span className="text-[11px] text-muted-foreground">{eur(r.price)}</span>}
                  </div>
                </div>
              </div>
              <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="md:col-span-3" aria-label="Nome prodotto" data-testid={`confirm-row-${i}-name-input`} />
              <div className="md:col-span-2">
                <Select value={r.category} onValueChange={(v: string) => update(i, { category: v })}>
                  <SelectTrigger className="w-full" data-testid={`confirm-row-${i}-category-select`}>
                    <SelectValue>{(v) => catLabel[v as string] ?? (v as string)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1 md:col-span-2" role="radiogroup" aria-label="Dove lo conservi">
                {(["frigo", "dispensa", "freezer"] as Storage[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update(i, { storage: s })}
                    className={cn("flex-1 rounded-lg border px-1.5 py-1.5 text-xs transition-colors duration-150", r.storage === s ? "border-leaf bg-leaf text-white" : "border-border hover:bg-accent")}
                    data-testid={`confirm-row-${i}-storage-${s}`}
                  >
                    {STORAGE_LABEL[s]}
                  </button>
                ))}
              </div>
              <div className="md:col-span-2">
                <Input type="date" value={r.expiry} onChange={(e) => update(i, { expiry: e.target.value })} aria-label="Scadenza in etichetta (facoltativa)" title="Scadenza in etichetta (facoltativa)" data-testid={`confirm-row-${i}-expiry-input`} />
              </div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm text-muted-foreground">{kept} prodotti selezionati · la scadenza vera è facoltativa ma ha la precedenza</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRows(null)} data-testid="confirm-cancel-button"><Undo2 className="size-4" />Annulla</Button>
            <Button onClick={save} disabled={confirm.isPending} data-testid="confirm-save-button">
              {confirm.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Metti in dispensa
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5" data-testid="scan-screen">
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-input bg-card p-6 lg:col-span-3">
        {parse.isPending && <div className="pointer-events-none absolute inset-x-6 top-6 h-0.5 bg-leaf shadow-[0_0_12px_#1E7B4D] animate-scan" />}
        <div className="flex flex-col items-center gap-4 text-center">
          {preview ? (
            <img src={preview} alt="Anteprima scontrino" className="max-h-56 rounded-lg object-contain" data-testid="scan-preview-image" />
          ) : (
            <span className="grid size-16 place-items-center rounded-2xl bg-accent text-leaf"><Camera className="size-8" aria-hidden /></span>
          )}
          <div>
            <h3 className="text-xl font-semibold">Fotografa lo scontrino</h3>
            <p className="mt-1 text-sm text-muted-foreground">Scontrino intero, dritto e ben illuminato. La foto non viene salvata.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden"
            onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="scan-file-input" />
          <Button size="lg" onClick={() => fileRef.current?.click()} disabled={parse.isPending} data-testid="scan-upload-button">
            {parse.isPending ? <><Loader2 className="size-4 animate-spin" />Sto leggendo… (5–15 s)</> : <><Camera className="size-4" />Scatta o scegli foto</>}
          </Button>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <div className="flex items-center gap-2 font-medium"><FileText className="size-4 text-leaf" />Oppure incolla il testo</div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Una riga per prodotto, come sullo scontrino" className="font-mono text-xs" data-testid="scan-text-input" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setText(SAMPLE)} data-testid="scan-sample-button"><Sparkles className="size-4" />Usa esempio</Button>
          {text && <Button variant="ghost" size="sm" onClick={() => setText("")} data-testid="scan-clear-text-button"><Trash2 className="size-4" />Svuota</Button>}
          <Button size="sm" className="ml-auto" disabled={!text.trim() || parse.isPending} onClick={() => run({ text })} data-testid="scan-text-submit-button">
            {parse.isPending ? <Loader2 className="size-4 animate-spin" /> : null}Leggi testo
          </Button>
        </div>
      </div>
    </div>
  );
}
