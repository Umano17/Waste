"""Accesso alla Dispensa dall'iPhone, fuori casa, senza aprirla a Internet.

Come funziona:
  - Il server ascolta SOLO su 127.0.0.1. Sul Mac gira Tailscale (rete privata gratuita tra i tuoi
    dispositivi) con:  tailscale serve --bg --https=8444 http://127.0.0.1:8770
    Tailscale la pubblica in HTTPS solo dentro la tua rete privata: https://<nome-mac>.<rete>.ts.net:8444
  - Le richieste che arrivano così sono «remote» e passano da qui:
      1. devono venire da Tailscale (nome *.ts.net e intestazione Tailscale-User-Login, che Tailscale aggiunge
         solo per i tuoi dispositivi: con Tailscale Funnel, cioè aperto a tutti, NON c'è → rifiutate);
      2. possono raggiungere solo le pagine elencate in PERCORSI;
      3. serve il PIN (DISPENSA_PIN nel file .env); dopo il PIN giusto il telefono resta riconosciuto 30 giorni;
         5 PIN sbagliati bloccano l'accesso remoto per 15 minuti;
      4. le richieste che modificano qualcosa devono partire dalla pagina stessa (controllo Origin).
  - Senza DISPENSA_PIN nel file .env l'accesso remoto è spento.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

from flask import jsonify, abort, redirect

FILE_SEGRETO = Path(__file__).parent / "dati" / "accesso_segreto.txt"
COOKIE = "dispensa_accesso"
DURATA = 30 * 86400
# pagine e API raggiungibili da fuori
PERCORSI = ("/dispensa", "/api/dispensa/", "/api/dispensa", "/api/accesso", "/icone/")
LIBERI = ("/dispensa", "/api/accesso", "/icone/")      # raggiungibili prima del PIN (la pagina chiede il PIN)

_lock = threading.Lock()
_errori: list[float] = []


def _pin() -> str:
    return os.getenv("DISPENSA_PIN", "").strip()


def attivo() -> bool:
    return len(_pin()) >= 4


def _segreto() -> bytes:
    with _lock:
        try:
            s = FILE_SEGRETO.read_text().strip()
        except OSError:
            s = ""
        if len(s) < 32:
            s = secrets.token_hex(32)
            FILE_SEGRETO.parent.mkdir(parents=True, exist_ok=True)
            FILE_SEGRETO.write_text(s)
            try:
                os.chmod(FILE_SEGRETO, 0o600)
            except OSError:
                pass
        return s.encode()


def _firma(scade: int) -> str:
    # la firma dipende anche dal PIN: cambiando il PIN tutti i telefoni devono reinserirlo
    return hmac.new(_segreto(), f"{scade}:{_pin()}".encode(), hashlib.sha256).hexdigest()


def gettone() -> str:
    scade = int(time.time()) + DURATA
    return f"{scade}.{_firma(scade)}"


def gettone_valido(v: str | None) -> bool:
    try:
        scade, firma = (v or "").split(".", 1)
        return int(scade) > time.time() and hmac.compare_digest(firma, _firma(int(scade)))
    except ValueError:
        return False


def e_remota(req, host_locali: set) -> bool:
    """Remota = non arriva dalla schermata sul Mac. Anche con nome locale, le intestazioni di un proxy
    (Tailscale) la rendono remota: così non si salta mai il PIN."""
    return (req.host not in host_locali or bool(req.headers.get("Tailscale-User-Login"))
            or bool(req.headers.get("X-Forwarded-For")))


def _host_tailscale(req) -> str:
    h = (req.headers.get("X-Forwarded-Host") or req.host or "").split(":")[0].lower()
    return h if h.endswith(".ts.net") else ""


def controlla(req):
    """Chiamata da before_request per le richieste remote. Restituisce None se passa, altrimenti la risposta."""
    if not attivo():
        abort(403)
    if not _host_tailscale(req) or not req.headers.get("Tailscale-User-Login"):
        abort(403)                                   # solo dispositivi della tua rete Tailscale (niente Funnel)
    if req.path == "/":
        return redirect("/dispensa")                 # dall'iPhone l'indirizzo «nudo» porta alla Dispensa
    if not any(req.path == p.rstrip("/") or req.path.startswith(p) for p in PERCORSI):
        abort(403)
    if req.method not in ("GET", "HEAD", "OPTIONS"):
        # l'origine può avere la porta (es. :8444) quando Tailscale serve non usa la 443: conta solo il nome
        origine = urlsplit((req.headers.get("Origin") or "").lower())
        if origine.scheme != "https" or origine.hostname != _host_tailscale(req):
            abort(403)
    if any(req.path == p.rstrip("/") or req.path.startswith(p) for p in LIBERI):
        return None
    if not gettone_valido(req.cookies.get(COOKIE)):
        return jsonify({"errore": "Serve il PIN.", "pin": True}), 401
    return None


def entra(pin: str):
    """Verifica il PIN e restituisce (ok, messaggio). Blocco di 15 minuti dopo 5 errori."""
    adesso = time.time()
    with _lock:
        _errori[:] = [t for t in _errori if adesso - t < 900]
        if len(_errori) >= 5:
            return False, "Troppi tentativi: riprova tra 15 minuti."
    if attivo() and hmac.compare_digest(str(pin or "").strip(), _pin()):
        return True, "Ok"
    with _lock:
        _errori.append(adesso)
    try:
        from notifiche import configurato, notifica
        if configurato() and len(_errori) in (3, 5):
            notifica(f"🔒 {len(_errori)} PIN sbagliati per l'accesso remoto alla Dispensa." +
                     (" Accesso bloccato per 15 minuti." if len(_errori) == 5 else ""))
    except Exception:
        pass
    return False, "PIN sbagliato."


def imposta_cookie(risposta, req):
    risposta.set_cookie(COOKIE, gettone(), max_age=DURATA, secure=True, httponly=True, samesite="Strict",
                        path="/")
    return risposta
