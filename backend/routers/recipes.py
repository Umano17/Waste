import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
import os

import httpx
from fastapi import APIRouter, HTTPException

from lib.dates import today_iso
from lib.db import db
from lib.llm import ask_json
from models.recipes import (
    CookRequest, MorningSummary, Recipe, RecipeIngredient, SendResult, TelegramSettings, TelegramSettingsInput,
)
from routers.pantry import active_items

router = APIRouter()
logger = logging.getLogger(__name__)

RECIPE_SYSTEM = """Sei un cuoco e nutrizionista italiano. Proponi ricette casalinghe, salutari (stile mediterraneo:
verdure, legumi, cereali integrali, poche fritture, sale moderato), facili, in italiano. Rispondi SOLO con JSON valido."""


async def generate_recipes() -> list[Recipe]:
    items = await active_items()
    if not items:
        raise HTTPException(status_code=400, detail="La dispensa è vuota: aggiungi prima uno scontrino")
    lines = "\n".join(
        f"- id={i.id} | {i.name} {i.quantity} | {i.storage}{', aperto' if i.opened else ''} | giorni rimasti: {i.days_left}"
        for i in items[:60]
    )
    prompt = f"""Dispensa attuale (ordinata dal più urgente):
{lines}

Proponi 3 ricette per oggi. Regole:
1. Ogni ricetta deve usare per primi gli ingredienti con MENO giorni rimasti (soprattutto quelli con 2 giorni o meno).
2. Usa il più possibile ingredienti presenti; puoi aggiungere solo basi comuni (olio, sale, spezie, aglio, acqua).
3. Ricette diverse tra loro (es. un primo, un secondo/piatto unico, uno spuntino o contorno).
JSON: {{"recipes": [{{"title": "...", "minutes": 25, "servings": 2,
 "why": "frase breve: quali ingredienti in scadenza salva",
 "health_notes": "frase breve sul perché è salutare",
 "ingredients": [{{"name": "...", "quantity": "...", "pantry_item_id": "id dalla lista oppure null"}}],
 "steps": ["passo 1", "passo 2"]}}]}}"""
    try:
        data = await ask_json(RECIPE_SYSTEM, prompt)
    except Exception as exc:
        logger.exception("recipes failed")
        raise HTTPException(status_code=502, detail=f"Generazione ricette non riuscita: {exc}") from exc
    valid_ids = {i.id for i in items}
    today = today_iso()
    recipes = []
    for r in data.get("recipes", [])[:3]:
        ingredients = [
            RecipeIngredient(name=str(g.get("name", "")), quantity=str(g.get("quantity") or ""),
                             pantry_item_id=g.get("pantry_item_id") if g.get("pantry_item_id") in valid_ids else None)
            for g in r.get("ingredients", []) if g.get("name")
        ]
        recipes.append(Recipe(
            date=today, title=str(r.get("title", "Ricetta")), minutes=int(r.get("minutes") or 20),
            servings=int(r.get("servings") or 2), why=str(r.get("why", "")), health_notes=str(r.get("health_notes", "")),
            ingredients=ingredients, steps=[str(s) for s in r.get("steps", [])],
        ))
    await db.recipes.delete_many({"date": today})
    if recipes:
        await db.recipes.insert_many([r.model_dump() for r in recipes])
    return recipes


async def todays_recipes() -> list[Recipe]:
    docs = await db.recipes.find({"date": today_iso()}, {"_id": 0}).sort("created_at", 1).to_list(20)
    return [Recipe(**d) for d in docs]


@router.get("/recipes/today", response_model=list[Recipe])
async def get_today():
    return await todays_recipes()


@router.post("/recipes/generate", response_model=list[Recipe])
async def regenerate():
    return await generate_recipes()


@router.post("/recipes/{recipe_id}/cook", response_model=Recipe)
async def cook(recipe_id: str, req: CookRequest):
    doc = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ricetta non trovata")
    if req.item_ids:
        await db.pantry.update_many({"id": {"$in": req.item_ids}}, {"$set": {"status": "consumato"}})
    await db.recipes.update_one({"id": recipe_id}, {"$set": {"cooked": True}})
    doc["cooked"] = True
    return Recipe(**doc)


def build_message(urgent, recipes: list[Recipe]) -> str:
    lines = ["Buongiorno! Ecco la tua dispensa di oggi."]
    if urgent:
        lines.append("\nDa usare per primi:")
        for i in urgent[:10]:
            when = "scaduto o da controllare" if i.days_left < 0 else ("oggi" if i.days_left == 0 else f"entro {i.days_left} g")
            lines.append(f"• {i.name} — {when}")
    else:
        lines.append("\nNessun prodotto urgente oggi.")
    if recipes:
        lines.append("\nRicette suggerite:")
        lines += [f"• {r.title} ({r.minutes} min)" for r in recipes]
    lines.append("\nLe durate sono stime indicative: controlla sempre etichetta, odore e aspetto.")
    return "\n".join(lines)


async def summary() -> MorningSummary:
    items = await active_items()
    urgent = [i for i in items if i.days_left <= 2]
    recipes = await todays_recipes()
    return MorningSummary(date=today_iso(), urgent=urgent, recipes=recipes, message=build_message(urgent, recipes))


@router.get("/summary", response_model=MorningSummary)
async def get_summary():
    return await summary()


async def _settings_doc() -> dict:
    return await db.settings.find_one({"key": "telegram"}, {"_id": 0}) or {}


def _to_settings(doc: dict) -> TelegramSettings:
    token = doc.get("bot_token") or ""
    return TelegramSettings(
        configured=bool(token and doc.get("chat_id")), enabled=bool(doc.get("enabled", False)),
        chat_id=doc.get("chat_id") or "", token_hint=f"…{token[-4:]}" if token else "",
        send_time=doc.get("send_time") or "07:30", last_sent_date=doc.get("last_sent_date"),
    )


@router.get("/settings/telegram", response_model=TelegramSettings)
async def get_settings():
    return _to_settings(await _settings_doc())


@router.put("/settings/telegram", response_model=TelegramSettings)
async def put_settings(inp: TelegramSettingsInput):
    changes: dict = {"key": "telegram", "enabled": inp.enabled, "send_time": inp.send_time}
    if inp.bot_token:
        changes["bot_token"] = inp.bot_token.strip()
    if inp.chat_id is not None:
        changes["chat_id"] = inp.chat_id.strip()
    await db.settings.update_one({"key": "telegram"}, {"$set": changes}, upsert=True)
    return _to_settings(await _settings_doc())


async def send_telegram(text: str) -> SendResult:
    doc = await _settings_doc()
    if not (doc.get("bot_token") and doc.get("chat_id")):
        return SendResult(ok=False, detail="Telegram non configurato: inserisci token del bot e chat ID")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(f"https://api.telegram.org/bot{doc['bot_token']}/sendMessage",
                                  json={"chat_id": doc["chat_id"], "text": text})
        body = r.json()
        if body.get("ok"):
            return SendResult(ok=True, detail="Messaggio inviato su Telegram")
        return SendResult(ok=False, detail=f"Telegram ha risposto: {body.get('description', r.status_code)}")
    except Exception as exc:
        return SendResult(ok=False, detail=f"Invio non riuscito: {exc}")


@router.post("/telegram/send", response_model=SendResult)
async def send_now():
    return await send_telegram((await summary()).message)


async def morning_loop() -> None:
    """Ogni minuto: se è passata l'ora dell'avviso e oggi non è ancora partito, genera ricette e invia."""
    tz = ZoneInfo(os.environ.get("APP_TZ", "Europe/Rome"))
    while True:
        try:
            doc = await _settings_doc()
            now = datetime.now(tz)
            today = today_iso()
            if (doc.get("enabled") and doc.get("bot_token") and doc.get("chat_id")
                    and now.strftime("%H:%M") >= (doc.get("send_time") or "07:30")
                    and doc.get("last_sent_date") != today):
                await db.settings.update_one({"key": "telegram"}, {"$set": {"last_sent_date": today}})
                if not await todays_recipes() and await active_items():
                    try:
                        await generate_recipes()
                    except HTTPException:
                        pass
                res = await send_telegram((await summary()).message)
                logger.info("morning alert: %s", res.detail)
        except Exception:
            logger.exception("morning loop error")
        await asyncio.sleep(60)
