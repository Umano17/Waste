"""Server: controllo d'ingresso (solo Mac, Tailscale + PIN), fascia oraria e API principali."""
import datetime as dt

import pytest

import app as server
import dispensa

MAC = {"Host": "127.0.0.1:8770"}
TS = {"Host": "mac.rete.ts.net:8444", "Tailscale-User-Login": "io@example.com"}
ORIGINE_TS = {"Origin": "https://mac.rete.ts.net:8444"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(server, "ORARIO", "sempre")
    return server.app.test_client()


def test_dal_mac_funziona(client):
    assert client.get("/dispensa", headers=MAC).status_code == 200
    r = client.post("/api/dispensa/prodotti", json={"nome": "Zucchine", "categoria": "verdura"},
                    headers={**MAC, "Origin": "http://127.0.0.1:8770"})
    assert r.status_code == 200 and r.get_json()["nome"] == "Zucchine"


def test_altri_siti_e_host_estranei_bloccati(client):
    assert client.get("/api/dispensa", headers={"Host": "evil.com"}).status_code == 403
    assert client.post("/api/dispensa/ricomincia", headers={**MAC, "Origin": "http://evil.com"}).status_code == 403


def test_da_tailscale_serve_il_pin(client):
    assert client.get("/dispensa", headers=TS).status_code == 200                  # la pagina chiede il PIN
    assert client.get("/api/dispensa", headers=TS).status_code == 401
    assert client.post("/api/accesso", json={"pin": "0000"}, headers={**TS, **ORIGINE_TS}).status_code == 401
    assert client.post("/api/accesso", json={"pin": "4821"}, headers={**TS, **ORIGINE_TS}).status_code == 200
    assert client.get("/api/dispensa", headers=TS).status_code == 200              # cookie valido


def test_origine_tailscale_con_porta_accettata_ma_non_http(client):
    ok = client.post("/api/accesso", json={"pin": "4821"}, headers={**TS, **ORIGINE_TS})
    no = client.post("/api/accesso", json={"pin": "4821"}, headers={**TS, "Origin": "http://mac.rete.ts.net:8444"})
    assert ok.status_code == 200 and no.status_code == 403


def test_senza_login_tailscale_rifiutata(client):
    """Tailscale Funnel (aperto a Internet) non manda Tailscale-User-Login: niente accesso."""
    assert client.get("/dispensa", headers={"Host": "mac.rete.ts.net"}).status_code == 403


def test_senza_pin_configurato_accesso_remoto_spento(client, monkeypatch):
    monkeypatch.setenv("DISPENSA_PIN", "")
    assert client.get("/dispensa", headers=TS).status_code == 403


@pytest.mark.parametrize("ora,aperta", [("08:59", False), ("09:00", True), ("19:59", True), ("20:00", False)])
def test_fascia_oraria(monkeypatch, ora, aperta):
    h, m = map(int, ora.split(":"))
    monkeypatch.setattr(server, "ORARIO", "09:00-20:00")
    monkeypatch.setattr(dispensa, "adesso", lambda: dt.datetime(2026, 10, 27, h, m, tzinfo=dispensa.FUSO))
    c = server.app.test_client()
    assert server.aperta() is aperta
    assert c.get("/api/dispensa", headers=MAC).status_code == (200 if aperta else 503)


def test_cestino_e_ripristino_via_api(client):
    p = client.post("/api/dispensa/prodotti", json={"nome": "Pane", "categoria": "pane", "pezzi": 2}, headers=MAC).get_json()
    uno = client.post(f"/api/dispensa/prodotti/{p['id']}", json={"stato": "buttato", "uno": True}, headers=MAC).get_json()
    assert [x["nome"] for x in client.get("/api/dispensa/cestino", headers=MAC).get_json()["prodotti"]] == ["Pane"]
    client.post(f"/api/dispensa/prodotti/{uno['id']}", json={"stato": "attivo"}, headers=MAC)
    assert client.get("/api/dispensa", headers=MAC).get_json()["prodotti"][0]["pezzi"] == 2
