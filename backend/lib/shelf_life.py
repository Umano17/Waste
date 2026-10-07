"""Tabella delle durate indicative (giorni) per categoria × luogo × chiuso/aperto.

Valori prudenziali derivati da: USDA FSIS FoodKeeper, EFSA (2020, date marking guidance),
indicazioni del Ministero della Salute. Sono STIME: l'etichetta del produttore prevale sempre.
"""

from datetime import date, timedelta

STORAGES = ("frigo", "dispensa", "freezer")

# categoria: (etichetta, {luogo: giorni da chiuso}, giorni dopo apertura (in frigo))
# None = luogo sconsigliato per quella categoria → durata minima di 1 giorno
TABLE: dict[str, tuple[str, dict[str, int | None], int]] = {
    "latte_fresco": ("Latte fresco", {"frigo": 6, "dispensa": None, "freezer": 90}, 3),
    "latte_uht": ("Latte UHT / vegetale", {"frigo": 90, "dispensa": 90, "freezer": 90}, 4),
    "yogurt": ("Yogurt e latticini", {"frigo": 14, "dispensa": None, "freezer": 60}, 4),
    "formaggio_fresco": ("Formaggi freschi (mozzarella, ricotta…)", {"frigo": 5, "dispensa": None, "freezer": 60}, 2),
    "formaggio_stagionato": ("Formaggi stagionati", {"frigo": 30, "dispensa": 3, "freezer": 180}, 21),
    "uova": ("Uova", {"frigo": 28, "dispensa": 14, "freezer": None}, 2),
    "carne_fresca": ("Carne fresca (bovino, suino)", {"frigo": 3, "dispensa": None, "freezer": 120}, 2),
    "carne_macinata": ("Carne macinata / salsiccia", {"frigo": 1, "dispensa": None, "freezer": 90}, 1),
    "pollame": ("Pollo e tacchino", {"frigo": 2, "dispensa": None, "freezer": 270}, 1),
    "pesce_fresco": ("Pesce fresco", {"frigo": 1, "dispensa": None, "freezer": 90}, 1),
    "salumi": ("Salumi e affettati", {"frigo": 14, "dispensa": None, "freezer": 60}, 4),
    "verdura_foglia": ("Insalata e verdura a foglia", {"frigo": 5, "dispensa": 1, "freezer": None}, 2),
    "verdura": ("Verdura", {"frigo": 7, "dispensa": 4, "freezer": 240}, 3),
    "frutta": ("Frutta", {"frigo": 10, "dispensa": 5, "freezer": 240}, 2),
    "frutta_delicata": ("Frutta delicata (frutti di bosco, banane…)", {"frigo": 4, "dispensa": 3, "freezer": 240}, 1),
    "pane": ("Pane fresco", {"frigo": 4, "dispensa": 2, "freezer": 90}, 2),
    "secco": ("Pasta, riso, farine, legumi secchi", {"frigo": 365, "dispensa": 365, "freezer": 365}, 180),
    "conserve": ("Conserve e scatolame (passata, legumi…)", {"frigo": 365, "dispensa": 365, "freezer": None}, 4),
    "surgelati": ("Surgelati", {"frigo": 1, "dispensa": None, "freezer": 180}, 1),
    "gastronomia": ("Piatti pronti e gastronomia", {"frigo": 3, "dispensa": None, "freezer": 60}, 2),
    "condimenti": ("Salse e condimenti", {"frigo": 180, "dispensa": 180, "freezer": None}, 60),
    "dolci_snack": ("Biscotti, dolci, snack", {"frigo": 120, "dispensa": 120, "freezer": 120}, 21),
    "bevande": ("Bevande", {"frigo": 180, "dispensa": 180, "freezer": None}, 3),
    "altro": ("Altro", {"frigo": 7, "dispensa": 30, "freezer": 90}, 5),
}

DEFAULT_STORAGE = {
    "latte_fresco": "frigo", "latte_uht": "dispensa", "yogurt": "frigo", "formaggio_fresco": "frigo",
    "formaggio_stagionato": "frigo", "uova": "frigo", "carne_fresca": "frigo", "carne_macinata": "frigo",
    "pollame": "frigo", "pesce_fresco": "frigo", "salumi": "frigo", "verdura_foglia": "frigo",
    "verdura": "frigo", "frutta": "dispensa", "frutta_delicata": "dispensa", "pane": "dispensa",
    "secco": "dispensa", "conserve": "dispensa", "surgelati": "freezer", "gastronomia": "frigo",
    "condimenti": "dispensa", "dolci_snack": "dispensa", "bevande": "dispensa", "altro": "dispensa",
}


def normalize_category(cat: str | None) -> str:
    return cat if cat in TABLE else "altro"


def compute_use_by(
    category: str, storage: str, purchase_date: str, opened: bool,
    opened_at: str | None, expiry_date: str | None,
) -> tuple[date, str]:
    """Ritorna (data 'consumare entro', fonte). La data vera di scadenza ha la precedenza
    sulla stima da chiuso; una volta aperto vale la più vicina tra scadenza e durata dopo apertura."""
    _, closed, open_days = TABLE[normalize_category(category)]
    if expiry_date:
        end, source = date.fromisoformat(expiry_date), "etichetta"
    else:
        days = closed.get(storage)
        end = date.fromisoformat(purchase_date) + timedelta(days=days if days is not None else 1)
        source = "stima"
    if opened:
        start = date.fromisoformat(opened_at or purchase_date)
        # in freezer l'apertura non accorcia la durata
        after_open = start + timedelta(days=open_days if storage != "freezer" else (closed.get("freezer") or open_days))
        if after_open < end:
            end, source = after_open, "stima_apertura"
    return end, source


def urgency(days_left: int) -> str:
    if days_left <= 2:
        return "rosso"
    if days_left <= 5:
        return "giallo"
    return "verde"
