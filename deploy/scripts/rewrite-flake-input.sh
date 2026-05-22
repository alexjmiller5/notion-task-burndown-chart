#!/usr/bin/env bash
# Rewrite the burndown flake input from path:../nix to path:./burndown-nix
# in /etc/nixos/flake.nix on the VM. Idempotent.
set -euo pipefail
sed -i 's|path:\.\./nix|path:./burndown-nix|g' /etc/nixos/flake.nix
