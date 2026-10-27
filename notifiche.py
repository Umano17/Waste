"""Invio di messaggi su Telegram (solo invio: nessuna lettura, quindi nessun conflitto con altri bot).

Serve TELEGRAM_TOKEN e TELEGRAM_CHAT_ID nel file .env; senza, l'invio resta spento.
"""
from __future__ import annotations

import os

import requests


def configurato() -> bool:
    return bool(os.getenv("TELEGRAM_TOKEN", "").strip() and os.getenv("TELEGRAM_CHAT_ID", "").strip())


def notifica(testo: str) -> None:
    if not configurato():
        raise RuntimeError("Telegram non è configurato: aggiungi TELEGRAM_TOKEN e TELEGRAM_CHAT_ID nel file .env.")
    r = requests.post(f"https://api.telegram.org/bot{os.environ['TELEGRAM_TOKEN'].strip()}/sendMessage",
                      json={"chat_id": os.environ["TELEGRAM_CHAT_ID"].strip(), "text": testo[:4000]}, timeout=15)
    r.raise_for_status()
