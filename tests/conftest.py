"""Ogni test lavora su una cartella dati vuota e temporanea: i dati veri in dati/ non vengono mai toccati."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import accesso  # noqa: E402
import dispensa  # noqa: E402


@pytest.fixture(autouse=True)
def dati_temporanei(tmp_path, monkeypatch):
    monkeypatch.setattr(dispensa, "DATI", tmp_path)
    monkeypatch.setattr(accesso, "FILE_SEGRETO", tmp_path / "accesso_segreto.txt")
    monkeypatch.setenv("DISPENSA_PIN", "4821")
    monkeypatch.delenv("TELEGRAM_TOKEN", raising=False)
    return tmp_path
