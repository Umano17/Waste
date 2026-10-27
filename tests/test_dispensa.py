"""Logica della dispensa: durate, urgenza, pezzi, cestino, ricette. Nessuna chiamata a Claude."""
import datetime as dt

import pytest

import dispensa as d


def _giorni(n: int) -> str:
    return (dt.date.fromisoformat(d.oggi()) + dt.timedelta(days=n)).isoformat()


# ---------------------------------------------------------------- durate e urgenza

def test_stima_da_tabella_per_categoria_e_luogo():
    p = d.aggiungi({"nome": "Mozzarella", "categoria": "formaggio_fresco", "luogo": "frigo"})
    assert p["fonte"] == "stima"
    assert p["giorni"] == 5                      # formaggio fresco in frigo: 5 giorni


def test_la_data_in_etichetta_vince_sulla_stima():
    p = d.aggiungi({"nome": "Yogurt", "categoria": "yogurt", "scadenza": _giorni(30)})
    assert p["fonte"] == "etichetta" and p["giorni"] == 30


def test_aperto_accorcia_ma_non_supera_l_etichetta():
    p = d.aggiungi({"nome": "Latte", "categoria": "latte_uht", "scadenza": _giorni(60), "aperto": True})
    assert p["fonte"] == "stima_apertura" and p["giorni"] == 4     # UHT aperto: 4 giorni


def test_luogo_sconsigliato_vale_un_giorno():
    p = d.aggiungi({"nome": "Pesce", "categoria": "pesce_fresco", "luogo": "dispensa"})
    assert p["giorni"] == 1


@pytest.mark.parametrize("giorni,colore", [(-1, "rosso"), (2, "rosso"), (3, "giallo"), (5, "giallo"), (6, "verde")])
def test_soglie_di_urgenza(giorni, colore):
    assert d.urgenza(giorni) == colore


def test_categoria_sconosciuta_diventa_altro():
    assert d.aggiungi({"nome": "Boh", "categoria": "inventata"})["categoria"] == "altro"


def test_nome_obbligatorio():
    with pytest.raises(ValueError):
        d.aggiungi({"nome": "  ", "categoria": "verdura"})


# ---------------------------------------------------------------- pezzi uguali

def test_pezzi_validati():
    assert [d._pezzi({"pezzi": v}) for v in ("abc", 0, 500, None, 3)] == [1, 1, 99, 1, 3]


def test_prodotti_vecchi_ricavano_i_pezzi_dalla_quantita():
    assert [d._pezzi({"quantita": q}) for q in ("2 pz", "18 pz", "125 g", "1,5 L", "")] == [2, 18, 1, 1, 1]
    vecchio = {**d._nuovo({"nome": "Tonno", "categoria": "conserve"}), "quantita": "2 pz"}
    del vecchio["pezzi"]
    d._scrivi("prodotti", [vecchio])
    uno = d.aggiorna(vecchio["id"], quanti=1, aperto=True)
    resto = next(x for x in d.elenco() if x["id"] == vecchio["id"])
    assert uno["pezzi"] == 1 and resto["pezzi"] == 1 and resto["quantita"] == ""


def test_apri_uno_stacca_un_pezzo_con_la_sua_scadenza():
    p = d.aggiungi({"nome": "Mozzarella", "categoria": "formaggio_fresco", "pezzi": 2})
    uno = d.aggiorna(p["id"], quanti=1, aperto=True)
    assert uno["id"] != p["id"] and uno["pezzi"] == 1 and uno["aperto"]
    resto = next(x for x in d.elenco() if x["id"] == p["id"])
    assert resto["pezzi"] == 1 and not resto["aperto"]
    assert uno["giorni"] < resto["giorni"]


def test_senza_uno_la_modifica_vale_per_tutta_la_confezione():
    p = d.aggiungi({"nome": "Uova", "categoria": "uova", "pezzi": 6})
    d.aggiorna(p["id"], stato="consumato")
    assert d.elenco() == []


def test_ripristino_riunisce_il_pezzo_alla_confezione():
    p = d.aggiungi({"nome": "Uova", "categoria": "uova", "pezzi": 3})
    finito = d.aggiorna(p["id"], quanti=1, stato="consumato")
    assert [x["pezzi"] for x in d.elenco()] == [2]
    d.aggiorna(finito["id"], stato="attivo")
    assert [x["pezzi"] for x in d.elenco()] == [3]
    assert d.cestino() == []


def test_pezzo_aperto_ripristinato_resta_separato():
    p = d.aggiungi({"nome": "Yogurt", "categoria": "yogurt", "pezzi": 4})
    aperto = d.aggiorna(p["id"], quanti=1, aperto=True)
    d.aggiorna(aperto["id"], stato="buttato")
    d.aggiorna(aperto["id"], stato="attivo")
    assert sorted(x["pezzi"] for x in d.elenco()) == [1, 3]


# ---------------------------------------------------------------- scadenza e cestino

def test_cambio_e_rimozione_della_scadenza():
    p = d.aggiungi({"nome": "Pane", "categoria": "pane"})
    assert d.aggiorna(p["id"], scadenza=_giorni(9))["fonte"] == "etichetta"
    assert d.aggiorna(p["id"], togli_scadenza=True)["fonte"] == "stima"


def test_cestino_mostra_finiti_e_buttati_dal_piu_recente():
    a = d.aggiungi({"nome": "A", "categoria": "verdura"})
    b = d.aggiungi({"nome": "B", "categoria": "verdura"})
    d.aggiorna(a["id"], stato="consumato")
    d.aggiorna(b["id"], stato="buttato")
    assert {x["nome"] for x in d.cestino()} == {"A", "B"}
    assert d.elenco() == []


def test_prodotto_inesistente():
    with pytest.raises(ValueError):
        d.aggiorna("nessuno", stato="consumato")


def test_ricomincia_svuota_ma_tiene_le_abbreviazioni():
    d.conferma([{"nome": "Mozzarella fior di latte", "riga": "MOZZ.FDL 125G", "categoria": "formaggio_fresco"}])
    r = d.ricomincia()
    assert r == {"tolti": 1, "abbreviazioni": 1} and d.elenco() == []


# ---------------------------------------------------------------- scontrino e ricette (Claude finto)

def test_scontrino_usa_le_abbreviazioni_imparate(monkeypatch):
    d.conferma([{"nome": "Mozzarella fior di latte", "riga": "MOZZ.FDL 125G", "categoria": "formaggio_fresco"}])
    finto = {"negozio": "Coop", "data": "2099-01-01", "righe": [
        {"riga": "MOZZ.FDL 125G", "nome": "Mozz?", "categoria": "altro", "sicurezza": "bassa", "pezzi": 2},
        {"riga": "SACCHETTO", "nome": "Sacchetto", "categoria": "altro", "alimento": False}]}
    monkeypatch.setattr(d, "_chiedi", lambda *a, **k: finto)
    letto = d.leggi_scontrino(testo="MOZZ.FDL 125G 0,99")
    moz, sac = letto["righe"]
    assert moz["nome"] == "Mozzarella fior di latte" and moz["da_memoria"] and moz["pezzi"] == 2
    assert not sac["alimento"]
    assert letto["data"] == d.oggi()             # data nel futuro: corretta a oggi


def test_scontrino_vuoto_o_formato_sbagliato():
    with pytest.raises(ValueError):
        d.leggi_scontrino()
    with pytest.raises(ValueError):
        d.leggi_scontrino(immagine_b64="xx", tipo="image/gif")


def test_json_anche_dentro_un_blocco_di_codice():
    assert d._json('Ecco:\n```json\n{"a": 1}\n```') == {"a": 1}


def test_ricette_e_cucinata_tolgono_un_pezzo(monkeypatch):
    p = d.aggiungi({"nome": "Uova", "categoria": "uova", "pezzi": 6})
    monkeypatch.setattr(d, "_chiedi", lambda *a, **k: {"ricette": [{"titolo": "Frittata", "ingredienti": [
        {"nome": "Uova", "id": p["id"]}, {"nome": "Inventato", "id": "falso"}], "passi": ["Sbatti", "Cuoci"]}]})
    r = d.genera_ricette()[0]
    assert [g["id"] for g in r["ingredienti"]] == [p["id"], None]    # id inventati scartati
    d.cucinata(r["id"])
    assert [x["pezzi"] for x in d.elenco()] == [5]
    assert d.ricette_oggi()[0]["cucinata"]


def test_usare_piu_pezzi_insieme():
    p = d.aggiungi({"nome": "Zucchine", "categoria": "verdura", "pezzi": 8})
    usate = d.aggiorna(p["id"], quanti=4, stato="consumato")
    assert usate["pezzi"] == 4 and [x["pezzi"] for x in d.elenco()] == [4]
    d.aggiorna(usate["id"], stato="attivo")
    assert [x["pezzi"] for x in d.elenco()] == [8]


def test_frutta_e_verdura_non_si_aprono():
    p = d.aggiungi({"nome": "Mele", "categoria": "frutta", "pezzi": 3})
    assert not d.aggiorna(p["id"], quanti=1, aperto=True)["aperto"]
    assert not p["apribile"] and d.aggiungi({"nome": "Latte", "categoria": "latte_fresco"})["apribile"]


def test_indovina_il_tipo_dal_nome():
    casi = {"Tonno in scatola": "conserve", "tonno fresco": "pesce_fresco", "Zucchine": "verdura",
            "Latte di soia": "latte_uht", "Latte intero": "latte_fresco", "Mozzarella": "formaggio_fresco",
            "Petto di pollo": "pollame", "Penne rigate": "secco", "Mele Golden": "frutta", "Rucola": "verdura_foglia",
            "Coca-Cola Zero": "bevande", "Uova fresche": "uova", "Piselli surgelati": "surgelati", "xyz": None}
    assert {n: d.indovina(n) for n in casi} == casi
