import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveTelegram, useSendTelegram, useSummary, useTelegram } from "@/lib/queries";
import { dateIt, errMsg } from "@/lib/format";

function TelegramForm() {
  const { data: s } = useTelegram();
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const save = useSaveTelegram();
  const send = useSendTelegram();
  const chat = chatId ?? s?.chat_id ?? "";
  const sendTime = time ?? s?.send_time ?? "07:30";

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5" data-testid="telegram-settings">
      <div>
        <h3 className="text-lg font-semibold">Avviso su Telegram</h3>
        <p className="text-sm text-muted-foreground">
          Crea un bot con @BotFather, scrivigli un messaggio, poi inserisci qui il token e il tuo chat ID (lo trovi con @userinfobot).
        </p>
        <p className="mt-1 text-sm" data-testid="telegram-status">
          Stato: {s?.configured ? <strong className="text-[#15803D]">configurato (token {s.token_hint}){s.enabled ? `, invio alle ${s.send_time}` : ", invio automatico spento"}</strong> : <strong className="text-[#B45309]">non configurato</strong>}
          {s?.last_sent_date && <span className="text-muted-foreground"> · ultimo invio {dateIt(s.last_sent_date)}</span>}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="tg-token">Token del bot</Label>
          <Input id="tg-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={s?.token_hint ? `salvato ${s.token_hint}` : "123456:ABC…"} data-testid="telegram-token-input" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tg-chat">Chat ID</Label>
          <Input id="tg-chat" value={chat} onChange={(e) => setChatId(e.target.value)} placeholder="es. 123456789" data-testid="telegram-chat-input" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="tg-time">Ora dell'avviso (Italia)</Label>
          <Input id="tg-time" type="time" value={sendTime} onChange={(e) => setTime(e.target.value)} data-testid="telegram-time-input" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => save.mutate({ bot_token: token || null, chat_id: chat, enabled: true, send_time: sendTime }, {
            onSuccess: () => { toast.success("Impostazioni salvate"); setToken(""); },
            onError: (e) => toast.error(errMsg(e)),
          })}
          disabled={save.isPending}
          data-testid="telegram-save-button"
        >Salva e attiva</Button>
        {s?.enabled && (
          <Button variant="outline" onClick={() => save.mutate({ chat_id: chat, enabled: false, send_time: sendTime }, { onSuccess: () => toast.success("Invio automatico spento") })} data-testid="telegram-disable-button">
            Spegni invio automatico
          </Button>
        )}
        <Button variant="outline" disabled={send.isPending}
          onClick={() => send.mutate(undefined, { onSuccess: (r) => (r.ok ? toast.success(r.detail) : toast.error(r.detail)), onError: (e) => toast.error(errMsg(e)) })}
          data-testid="telegram-send-button">
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Invia adesso
        </Button>
      </div>
    </div>
  );
}

export default function Morning() {
  const { data, isError } = useSummary();
  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="morning">
      <div className="rounded-2xl bg-[linear-gradient(135deg,#112017_0%,#1B3526_100%)] p-6 text-white">
        <div className="flex items-center gap-2 text-[#86EFAC]"><Sunrise className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Riepilogo del mattino</span></div>
        {data && <div className="mt-1 text-sm text-[#A7C4B2]">{dateIt(data.date)}</div>}
        <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed" data-testid="morning-message">
          {isError ? "Riepilogo non disponibile (server non raggiungibile)." : data?.message ?? "Caricamento…"}
        </pre>
      </div>
      <TelegramForm />
    </div>
  );
}
