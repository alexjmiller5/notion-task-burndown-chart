set dotenv-load := true
set dotenv-filename := ".deploy.env"
set dotenv-required := false

dev:
  deno task dev

build:
  deno task build

test:
  deno task test

test-watch:
  deno test -A --unstable-sloppy-imports --watch

# First-time deploy: install Deno on the Pi, install systemd unit, configure
# tailscale serve, then run `just deploy` to ship the build.
deploy-bootstrap:
  @test -f .deploy.env || (echo "Missing .deploy.env — copy from .deploy.env.example" && exit 1)
  ssh "$PI_USER@$PI_HOST" "mkdir -p $PI_DIR"
  scp deploy/setup.sh "$PI_USER@$PI_HOST:/tmp/burndown-setup.sh"
  ssh "$PI_USER@$PI_HOST" "bash /tmp/burndown-setup.sh '$PI_DIR' '$SERVE_PORT' '$APP_PORT'"
  sed -e "s|__USER__|$PI_USER|g" \
      -e "s|__DIR__|$PI_DIR|g" \
      -e "s|__PORT__|$APP_PORT|g" \
      -e "s|__ORIGIN__|$ORIGIN|g" \
      deploy/burndown.service.template > /tmp/burndown.service
  scp /tmp/burndown.service "$PI_USER@$PI_HOST:/tmp/burndown.service"
  ssh "$PI_USER@$PI_HOST" "sudo install -m 644 /tmp/burndown.service /etc/systemd/system/burndown.service && sudo systemctl daemon-reload && sudo systemctl enable burndown.service"
  rm /tmp/burndown.service
  just deploy
  @echo ""
  @echo "✓ Bootstrap complete. App should be reachable at: $ORIGIN"

# Routine redeploy: build locally, rsync output to Pi, restart the service.
deploy:
  @test -f .deploy.env || (echo "Missing .deploy.env — copy from .deploy.env.example" && exit 1)
  deno task build
  rsync -az --delete build/ "$PI_USER@$PI_HOST:$PI_DIR/build/"
  rsync -az package.json "$PI_USER@$PI_HOST:$PI_DIR/package.json"
  ssh "$PI_USER@$PI_HOST" "sudo systemctl restart burndown.service"
  @echo "✓ Deployed. App: $ORIGIN"

# Tail the service logs from the Pi.
deploy-logs:
  ssh "$PI_USER@$PI_HOST" "sudo journalctl -u burndown.service -f -n 50"

# Show service + tailscale serve status on the Pi.
deploy-status:
  ssh "$PI_USER@$PI_HOST" "sudo systemctl status burndown.service --no-pager; echo; sudo tailscale serve status"

# Stop the service (without removing it).
deploy-stop:
  ssh "$PI_USER@$PI_HOST" "sudo systemctl stop burndown.service"

# Remove the systemd unit and tailscale serve mapping. Cache file is preserved.
deploy-uninstall:
  ssh "$PI_USER@$PI_HOST" "sudo systemctl stop burndown.service; sudo systemctl disable burndown.service; sudo rm -f /etc/systemd/system/burndown.service; sudo systemctl daemon-reload; sudo tailscale serve --https=$SERVE_PORT off"
