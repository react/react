#!/bin/bash
# One-time setup for Codex (ChatGPT subscription) in React DevTools AI chat.
#
# Registers a Chrome native messaging host that lets the DevTools extension
# read ~/.codex/auth.json (and nothing else). Usage:
#
#   ./install.sh <extension-id>
#
# The extension ID is shown in the AI chat settings (and on
# chrome://extensions with Developer mode on).
set -euo pipefail

HOST_NAME="com.react_devtools.codex_auth"
DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_PATH="$DIR/codex_auth_host.py"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <extension-id>" >&2
  exit 1
fi
EXT_ID="$1"

case "$(uname)" in
  Darwin)
    TARGET_DIRS=(
      "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
      "$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
      "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    )
    ;;
  Linux)
    TARGET_DIRS=(
      "$HOME/.config/google-chrome/NativeMessagingHosts"
      "$HOME/.config/chromium/NativeMessagingHosts"
    )
    ;;
  *)
    echo "Unsupported platform: $(uname). On Windows, register the host" \
      "manifest via the registry (see Chrome native messaging docs)." >&2
    exit 1
    ;;
esac

chmod +x "$HOST_PATH"

for TARGET_DIR in "${TARGET_DIRS[@]}"; do
  # Only install for browsers the user actually has.
  PARENT="$(dirname "$TARGET_DIR")"
  if [ ! -d "$PARENT" ]; then
    continue
  fi
  mkdir -p "$TARGET_DIR"
  cat > "$TARGET_DIR/$HOST_NAME.json" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Reads ~/.codex/auth.json for React DevTools AI chat",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF
  echo "Installed: $TARGET_DIR/$HOST_NAME.json"
done

echo "Done. Reload the React DevTools extension, then reopen DevTools."
