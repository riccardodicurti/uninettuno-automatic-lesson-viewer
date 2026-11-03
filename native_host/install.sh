#!/bin/bash
# ============================================================
# Uninettuno Downloader — Native Messaging Host installer
# Compatibile con: Google Chrome, Chromium, Chrome Canary (macOS)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/uninettuno_downloader.py"
HOST_NAME="com.uninettuno.downloader"

# ----- Colori -----
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "=================================================="
echo "  Uninettuno Native Messaging Host — Installazione"
echo "=================================================="
echo ""

# ----- 1. Verifica Python3 -----
if ! command -v python3 &>/dev/null; then
    err "Python3 non trovato. Installa da https://www.python.org"
    exit 1
fi
ok "Python3 trovato: $(python3 --version)"

# ----- 2. Verifica FFmpeg -----
FFMPEG_PATH=""
for candidate in /opt/homebrew/bin/ffmpeg /usr/local/bin/ffmpeg /usr/bin/ffmpeg; do
    if [ -x "$candidate" ]; then
        FFMPEG_PATH="$candidate"
        break
    fi
done

if [ -z "$FFMPEG_PATH" ]; then
    warn "FFmpeg non trovato."
    echo "   Installa con: brew install ffmpeg"
    echo "   L'estensione non funzionerà senza FFmpeg."
else
    ok "FFmpeg trovato: $FFMPEG_PATH"
fi

# ----- 3. Extension ID -----
echo ""
echo "Apri Chrome e vai su: chrome://extensions"
echo "Abilita 'Modalità sviluppatore', poi cerca 'Uninettuno'."
echo ""
read -rp "Incolla qui l'Extension ID: " EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    err "Extension ID non inserito. Uscita."
    exit 1
fi
ok "Extension ID: $EXTENSION_ID"

# ----- 4. Copia lo script fuori da ~/Documents e rendilo eseguibile -----
# macOS blocca l'accesso a Documents/Desktop ai processi lanciati da Chrome:
# l'host deve stare in una cartella non protetta.
DEST_DIR="$HOME/Library/Application Support/UninettunoDownloader"
mkdir -p "$DEST_DIR"
PYTHON_BIN="$(command -v python3)"
# Shebang con percorso assoluto: Chrome usa un PATH minimo
{ echo "#!$PYTHON_BIN"; tail -n +2 "$PY_SCRIPT"; } > "$DEST_DIR/uninettuno_downloader.py"
PY_SCRIPT="$DEST_DIR/uninettuno_downloader.py"
chmod +x "$PY_SCRIPT"
ok "Host copiato in: $PY_SCRIPT (interprete: $PYTHON_BIN)"

# ----- 5. Crea il manifest JSON per ogni browser presente -----
MANIFEST_JSON=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Uninettuno video downloader using FFmpeg",
  "path": "$PY_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
)

install_for_browser() {
    local BROWSER_DIR="$1"
    local BROWSER_NAME="$2"
    if [ -d "$(dirname "$BROWSER_DIR")" ]; then
        mkdir -p "$BROWSER_DIR"
        echo "$MANIFEST_JSON" > "$BROWSER_DIR/$HOST_NAME.json"
        ok "Installato per $BROWSER_NAME"
    fi
}

BASE="$HOME/Library/Application Support"
install_for_browser "$BASE/Google/Chrome/NativeMessagingHosts"    "Google Chrome"
install_for_browser "$BASE/Google/Chrome Canary/NativeMessagingHosts" "Chrome Canary"
install_for_browser "$BASE/Chromium/NativeMessagingHosts"         "Chromium"
install_for_browser "$BASE/Microsoft Edge/NativeMessagingHosts"   "Microsoft Edge"

# ----- 6. Done -----
echo ""
echo "=================================================="
ok "Installazione completata!"
echo ""
echo "  Passaggi finali:"
echo "  1. Ricarica l'estensione su chrome://extensions"
echo "  2. Apri una videolezione Uninettuno"
echo "  3. Clicca il pulsante ⬇️ — FFmpeg scaricherà il video"
echo "     direttamente in ~/Downloads/"
echo "=================================================="
echo ""
