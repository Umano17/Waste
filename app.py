"""Server di Waste: la pagina /dispensa e le API /api/dispensa/... (Flask).

Ascolta solo su 127.0.0.1: dal Mac si apre http://127.0.0.1:8770/dispensa,
dall'iPhone passa da Tailscale con il PIN (vedi accesso.py).
Avvio:  python app.py
"""
from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

import accesso  # noqa: E402  (dopo load_dotenv: legge DISPENSA_PIN)
import dispensa  # noqa: E402

PORTA = int(os.getenv("DISPENSA_PORTA", "8770"))
HOST_AMMESSI = {f"127.0.0.1:{PORTA}", f"localhost:{PORTA}"}
ORIGINI_AMMESSE = {f"http://{h}" for h in HOST_AMMESSI}

ORARIO = os.getenv("DISPENSA_ORARIO", "09:00-20:00")   # fuori da questa fascia Waste riposa

app = Flask(__name__)


def aperta() -> bool:
    """True dentro la fascia oraria (es. 09:00-20:00, ora italiana). Vuoto o "sempre" = sempre aperta."""
    if ORARIO.strip().lower() in ("", "sempre"):
        return True
    inizio, fine = (x.strip() for x in ORARIO.split("-", 1))
    ora = dispensa.adesso().strftime("%H:%M")
    return inizio <= ora < fine if inizio < fine else (ora >= inizio or ora < fine)


def veglia() -> None:
    """Nella fascia oraria tiene sveglio il Mac (anche a batteria) con caffeinate; fuori lo lascia dormire.
    Lo schermo si spegne comunque. Solo su macOS."""
    if not shutil.which("caffeinate"):
        return
    proc = None
    while True:
        if aperta() and (proc is None or proc.poll() is not None):
            proc = subprocess.Popen(["caffeinate", "-i", "-w", str(os.getpid())])
        elif not aperta() and proc is not None and proc.poll() is None:
            proc.terminate()
            proc = None
        time.sleep(60)


@app.before_request
def solo_da_questo_mac():
    """Dal Mac: solo dalla pagina stessa (nessun altro sito può chiamare le API di nascosto).
    Da fuori: solo dispositivi Tailscale con PIN, controllati da accesso.controlla."""
    if accesso.e_remota(request, HOST_AMMESSI):
        return accesso.controlla(request)
    if request.host not in HOST_AMMESSI:
        abort(403)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origine = request.headers.get("Origin")
        if origine is not None and origine not in ORIGINI_AMMESSE:
            abort(403)
        if origine is None and request.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none"):
            abort(403)


@app.before_request
def fascia_oraria():
    if aperta() or request.path.startswith("/icone/"):
        return None
    testo = f"Waste riposa: torna disponibile alle {ORARIO.split('-')[0].strip()}."
    if request.path.startswith("/api/"):
        return jsonify({"errore": testo}), 503
    return (f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>Waste</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;'
            f'background:#16120F;color:#F3ECE4;font:18px -apple-system,sans-serif;text-align:center;padding:24px">'
            f'<div><div style="font-size:48px">🌙</div><p>{testo}</p></div>', 503)


def _errore(e, codice=400):
    return jsonify({"errore": str(e)}), codice


@app.route("/")
def home():
    return dispensa_pagina()


@app.route("/dispensa")
def dispensa_pagina():
    r = send_from_directory(BASE, "dispensa.html")
    r.headers["Cache-Control"] = "no-store"
    return r


@app.route("/icone/<path:nome>")
def icone(nome):
    return send_from_directory(BASE / "icone", nome)


@app.route("/api/accesso", methods=["GET", "POST"])
def api_accesso():
    remoto = accesso.e_remota(request, HOST_AMMESSI)
    if request.method == "GET":
        ok = (not remoto) or accesso.gettone_valido(request.cookies.get(accesso.COOKIE))
        return jsonify({"ok": ok, "remoto": remoto})
    if not remoto:
        return jsonify({"ok": True})
    ok, msg = accesso.entra((request.get_json(silent=True) or {}).get("pin"))
    if not ok:
        return jsonify({"ok": False, "errore": msg}), 401
    return accesso.imposta_cookie(jsonify({"ok": True}), request)


@app.route("/api/dispensa")
def stato():
    return jsonify({"prodotti": dispensa.elenco(), "statistiche": dispensa.statistiche(),
                    "categorie": dispensa.categorie(), "avvertenza": dispensa.AVVERTENZA})


@app.route("/api/dispensa/tipo")
def tipo():
    return jsonify({"categoria": dispensa.indovina(request.args.get("nome", "")[:120])})


@app.route("/api/dispensa/scontrino", methods=["POST"])
def scontrino():
    d = request.get_json(silent=True) or {}
    try:
        return jsonify(dispensa.leggi_scontrino(d.get("immagine"), d.get("tipo") or "image/jpeg", d.get("testo")))
    except ValueError as e:
        return _errore(e)
    except Exception as e:
        print("Waste, scontrino:", repr(e))
        return _errore("Lettura non riuscita: riprova con una foto più nitida o incolla il testo.", 502)


@app.route("/api/dispensa/bozza/<id_>")
def bozza(id_):
    b = dispensa.bozza(id_)
    return jsonify(b) if b else _errore("Scontrino non trovato o già confermato.", 404)


@app.route("/api/dispensa/conferma", methods=["POST"])
def conferma():
    d = request.get_json(silent=True) or {}
    try:
        out = dispensa.conferma(d.get("prodotti") or [], bool(d.get("ricorda", True)))
    except ValueError as e:
        return _errore(e)
    if d.get("bozza"):
        dispensa.chiudi_bozza(str(d["bozza"]))
    return jsonify({"aggiunti": out})


@app.route("/api/dispensa/prodotti", methods=["POST"])
def aggiungi():
    try:
        return jsonify(dispensa.aggiungi(request.get_json(silent=True) or {}))
    except ValueError as e:
        return _errore(e)


@app.route("/api/dispensa/prodotti/<id_>", methods=["POST"])
def aggiorna(id_):
    d = request.get_json(silent=True) or {}
    try:
        quanti = d.get("quanti", 1 if d.get("uno") else 0)
        return jsonify(dispensa.aggiorna(id_, quanti=quanti if isinstance(quanti, int) else 0,
                                         **{k: d.get(k) for k in ("stato", "aperto", "luogo", "scadenza", "togli_scadenza")}))
    except ValueError as e:
        return _errore(e, 404)


@app.route("/api/dispensa/cestino")
def cestino():
    return jsonify({"prodotti": dispensa.cestino()})


@app.route("/api/dispensa/ricomincia", methods=["POST"])
def ricomincia():
    return jsonify(dispensa.ricomincia())


@app.route("/api/dispensa/ricette", methods=["GET", "POST"])
def ricette():
    if request.method == "GET":
        return jsonify({"ricette": dispensa.ricette_oggi()})
    try:
        return jsonify({"ricette": dispensa.genera_ricette()})
    except ValueError as e:
        return _errore(e)
    except Exception as e:
        print("Waste, ricette:", repr(e))
        return _errore("Non sono riuscito a preparare le ricette: riprova tra poco.", 502)


@app.route("/api/dispensa/ricette/<id_>/cucinata", methods=["POST"])
def cucinata(id_):
    d = request.get_json(silent=True) or {}
    try:
        return jsonify(dispensa.cucinata(id_, d.get("prodotti")))
    except ValueError as e:
        return _errore(e, 404)


@app.route("/api/dispensa/riepilogo", methods=["GET", "POST"])
def riepilogo():
    r = dispensa.riepilogo()
    if request.method == "POST":
        import notifiche
        try:
            notifiche.notifica("🥫 Waste\n" + r["testo"])
        except Exception as e:
            return _errore(f"Invio non riuscito: {e}", 502)
        r["inviato"] = True
    return jsonify(r)


@app.route("/api/dispensa/abbreviazioni")
def abbreviazioni():
    return jsonify({"abbreviazioni": dispensa.abbreviazioni()})


@app.route("/api/dispensa/abbreviazioni/togli", methods=["POST"])
def togli_abbreviazione():
    dispensa.togli_abbreviazione(str((request.get_json(silent=True) or {}).get("chiave") or ""))
    return jsonify({"abbreviazioni": dispensa.abbreviazioni()})


if __name__ == "__main__":
    dispensa.avvia()      # riepilogo del mattino su Telegram, se configurato
    threading.Thread(target=veglia, daemon=True).start()
    print(f"Orario: {ORARIO}")
    print(f"Waste pronta: http://127.0.0.1:{PORTA}/dispensa")
    app.run(host="127.0.0.1", port=PORTA)   # 127.0.0.1 = raggiungibile solo da questo Mac (e da Tailscale)
