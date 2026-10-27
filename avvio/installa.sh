#!/bin/bash
# Installa (o reinstalla) il LaunchAgent: la Dispensa parte da sola all'accesso e riparte se si blocca.
# Uso:  bash avvio/installa.sh        Per toglierlo:  bash avvio/installa.sh --togli
set -e
CARTELLA="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Library/LaunchAgents/it.dispensa.plist"
launchctl bootout "gui/$(id -u)" "$DEST" 2>/dev/null || true
if [ "$1" = "--togli" ]; then rm -f "$DEST"; echo "LaunchAgent tolto."; exit 0; fi
[ -x "$CARTELLA/.venv/bin/python" ] || { echo "Manca .venv: crea prima l'ambiente (vedi README)."; exit 1; }
mkdir -p "$HOME/Library/LaunchAgents" "$CARTELLA/dati"
sed "s|__CARTELLA__|$CARTELLA|g" "$CARTELLA/avvio/it.dispensa.plist" > "$DEST"
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "Dispensa avviata e impostata per partire da sola. Registro: $CARTELLA/dati/dispensa.log"
