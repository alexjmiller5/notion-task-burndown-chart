#!/usr/bin/env bash
# One-time setup on the Pi: install Deno if missing, configure tailscale serve.
# Idempotent — safe to re-run.
set -euo pipefail

DEPLOY_DIR="${1:?missing deploy dir}"
SERVE_PORT="${2:?missing serve port}"
APP_PORT="${3:?missing app port}"

if ! command -v deno &> /dev/null && [ ! -x "$HOME/.deno/bin/deno" ]; then
  echo "==> Installing Deno"
  curl -fsSL https://deno.land/install.sh | sh
fi

mkdir -p "$DEPLOY_DIR"

echo "==> Configuring tailscale serve on https=$SERVE_PORT → http://localhost:$APP_PORT"
sudo tailscale serve --bg --https="$SERVE_PORT" "http://localhost:$APP_PORT"

echo "==> Current tailscale serve status:"
sudo tailscale serve status || true

echo "==> Setup complete."
