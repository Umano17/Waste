import logging
import re
from datetime import date

from fastapi import APIRouter, HTTPException

from lib.dates import today_iso
from lib.db import db
from lib.llm import ask_json
from lib.shelf_life import DEFAULT_STORAGE, STORAGES, TABLE, compute_use_by, normalize_category, urgency
from models.pantry import (
    Alias, CategoryInfo, ConfirmRequest, ItemInput, ItemUpdate, ParsedLine, ParsedReceipt,
    PantryItem, PantryItemOut, ParseRequest, ResetResult, Stats,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def alias_key(raw: str) -> str:
    """Normalizza la riga dello scontrino: maiuscole, niente prezzi/spazi doppi."""
    s = re.sub(r"\d+[.,]\d{2}\s*$", "", raw.upper())
    return re.sub(r"\s+", " ", s).strip()


def to_out(doc: dict) -> PantryItemOut:
    item = PantryItem(**doc)
    end, source = compute_use_by(item.category, item.storage, item.purchase_date,
                                 item.opened, item.opened_at, item.expiry_date)
    days_left = (end - date.fromisoformat(today_iso())).days
    return PantryItemOut(
        **item.model_dump(), category_label=TABLE[normalize_category(item.category)][0],
        use_by=end.isoformat(), days_left=days_left, urgency=urgency(days_left), source=source,
    )


async def active_items() -> list[PantryItemOut]:
    docs = await db.pantry.find({"status": "attivo"}, {"_id": 0}).to_list(2000)
    return sorted((to_out(d) for d in docs), key=lambda i: (i.days_left, i.name))


@router.get("/categories", response_model=list[CategoryInfo])
async def categories():
    return [
        CategoryInfo(key=k, label=v[0], days_frigo=v[1]["frigo"], days_dispensa=v[1]["dispensa"],
                     days_freezer=v[1]["freezer"], days_after_opening=v[2], default_storage=DEFAULT_STORAGE[k])
        for k, v in TABLE.items()
    ]


PARSE_SYSTEM = """Sei un esperto di scontrini dei supermercati italiani (Esselunga, Coop, Conad, Lidl, Carrefour, Eurospin...).
Interpreti le abbreviazioni (es. "MOZZ.FDL 125G" = Mozzarella fior di latte 125 g, "PS" = parzialmente scremato,
"INS." = insalata, "POM." = pomodoro). Rispondi SOLO con JSON valido, senza testo extra."""

PARSE_PROMPT = """Leggi lo scontrino ed estrai SOLO le righe di prodotto (ignora totali, IVA, sconti, resto, carte, punti).
Categorie ammesse: {cats}
Luoghi ammessi: frigo, dispensa, freezer.
Rispondi con questo JSON:
{{"store": "nome negozio o null", "purchase_date": "YYYY-MM-DD o null",
 "lines": [{{"raw_text": "testo esatto della riga", "name": "nome completo e chiaro in italiano",
  "category": "una categoria ammessa", "storage": "frigo|dispensa|freezer", "quantity": "es. 125 g, 1 L, 6 pz",
  "price": 1.29, "is_food": true, "confidence": "alta|media|bassa"}}]}}
Usa confidence "bassa" quando l'abbreviazione è ambigua. is_food=false per detersivi, sacchetti, prodotti non alimentari."""


@router.post("/receipts/parse", response_model=ParsedReceipt)
async def parse_receipt(req: ParseRequest):
    if not req.image_base64 and not (req.text and req.text.strip()):
        raise HTTPException(status_code=400, detail="Serve una foto o il testo dello scontrino")
    prompt = PARSE_PROMPT.format(cats=", ".join(TABLE.keys()))
    if req.text and not req.image_base64:
        prompt += f"\n\nTesto dello scontrino:\n{req.text}"
    image = req.image_base64.split(",", 1)[-1] if req.image_base64 else None
    try:
        data = await ask_json(PARSE_SYSTEM, prompt, image)
    except Exception as exc:
        logger.exception("parse failed")
        raise HTTPException(status_code=502, detail=f"Lettura non riuscita: {exc}") from exc

    aliases = {a["key"]: a for a in await db.aliases.find({}, {"_id": 0}).to_list(5000)}
    lines: list[ParsedLine] = []
    for raw in data.get("lines", []):
        raw_text = str(raw.get("raw_text") or raw.get("name") or "").strip()
        if not raw_text:
            continue
        cat = normalize_category(raw.get("category"))
        storage = raw.get("storage") if raw.get("storage") in STORAGES else DEFAULT_STORAGE[cat]
        price = raw.get("price")
        line = ParsedLine(
            raw_text=raw_text, name=str(raw.get("name") or raw_text), category=cat, storage=storage,
            quantity=str(raw.get("quantity") or ""), price=price if isinstance(price, (int, float)) else None,
            is_food=bool(raw.get("is_food", True)),
            confidence=raw.get("confidence") if raw.get("confidence") in ("alta", "media", "bassa") else "media",
        )
        known = aliases.get(alias_key(raw_text))
        if known:
            line.name, line.category, line.storage = known["name"], known["category"], known["storage"]
            line.confidence, line.from_memory, line.is_food = "alta", True, True
        lines.append(line)
    pdate = data.get("purchase_date")
    try:
        date.fromisoformat(pdate)
        if pdate > today_iso():
            pdate = today_iso()
    except (TypeError, ValueError):
        pdate = today_iso()
    return ParsedReceipt(store=data.get("store"), purchase_date=pdate, lines=lines)


async def _insert(inp: ItemInput) -> PantryItem:
    cat = normalize_category(inp.category)
    pdate = inp.purchase_date or today_iso()
    item = PantryItem(
        name=inp.name.strip(), raw_text=inp.raw_text, category=cat, storage=inp.storage,
        quantity=inp.quantity, price=inp.price, purchase_date=pdate, expiry_date=inp.expiry_date or None,
        opened=inp.opened, opened_at=today_iso() if inp.opened else None,
    )
    await db.pantry.insert_one(item.model_dump())
    return item


@router.post("/pantry/confirm", response_model=list[PantryItemOut])
async def confirm_items(req: ConfirmRequest):
    out = []
    for inp in req.items:
        item = await _insert(inp)
        if req.remember and inp.raw_text:
            key = alias_key(inp.raw_text)
            alias = Alias(key=key, raw_text=inp.raw_text, name=item.name, category=item.category, storage=item.storage)
            await db.aliases.update_one({"key": key}, {"$set": alias.model_dump()}, upsert=True)
        out.append(to_out(item.model_dump()))
    return out


@router.post("/pantry", response_model=PantryItemOut)
async def add_item(inp: ItemInput):
    item = await _insert(inp)
    return to_out(item.model_dump())


@router.get("/pantry", response_model=list[PantryItemOut])
async def list_pantry():
    return await active_items()


@router.get("/pantry/stats", response_model=Stats)
async def pantry_stats():
    items = await active_items()
    return Stats(
        active=len(items),
        consumed=await db.pantry.count_documents({"status": "consumato"}),
        thrown=await db.pantry.count_documents({"status": "buttato"}),
        urgent=sum(1 for i in items if i.urgency == "rosso"),
    )


@router.patch("/pantry/{item_id}", response_model=PantryItemOut)
async def update_item(item_id: str, upd: ItemUpdate):
    doc = await db.pantry.find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    changes: dict = {}
    if upd.status:
        changes["status"] = upd.status
    if upd.opened is not None:
        changes["opened"] = upd.opened
        changes["opened_at"] = today_iso() if upd.opened else None
    if upd.storage:
        changes["storage"] = upd.storage
    if upd.expiry_date:
        changes["expiry_date"] = upd.expiry_date
    if upd.clear_expiry:
        changes["expiry_date"] = None
    if changes:
        await db.pantry.update_one({"id": item_id}, {"$set": changes})
        doc.update(changes)
    return to_out(doc)


@router.delete("/pantry", response_model=ResetResult)
async def reset_pantry():
    """Ricomincia: svuota la dispensa e le ricette, conserva le abbreviazioni imparate."""
    res = await db.pantry.delete_many({})
    await db.recipes.delete_many({})
    return ResetResult(removed=res.deleted_count, aliases_kept=await db.aliases.count_documents({}))


@router.get("/aliases", response_model=list[Alias])
async def list_aliases():
    return await db.aliases.find({}, {"_id": 0}).sort("key", 1).to_list(5000)


@router.delete("/aliases/{key}", response_model=ResetResult)
async def delete_alias(key: str):
    res = await db.aliases.delete_one({"key": key})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Abbreviazione non trovata")
    return ResetResult(removed=1, aliases_kept=await db.aliases.count_documents({}))
