{ self }:
{ config, lib, pkgs, ... }:
let cfg = config.services.burndown; in {
  options.services.burndown = {
    enable = lib.mkEnableOption "Notion task burndown chart";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
      description = "Hermetic burndown build (defaults to this flake's packages.default).";
    };
    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Loopback port the SvelteKit server binds to.";
    };
    origin = lib.mkOption {
      type = lib.types.str;
      description = "Public ORIGIN URL (must match what users hit in the browser).";
    };
    envFile = lib.mkOption {
      type = lib.types.str;
      default = "/etc/burndown.env";
      description = "Path to environment file containing NOTION_API_KEY (mode 0600).";
    };
    tailscaleServe = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Whether to expose the service via `tailscale serve`.";
    };
    serveHttpsPort = lib.mkOption {
      type = lib.types.port;
      default = 443;
      description = "HTTPS port to expose via tailscale serve.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.burndown = {
      description = "Notion task burndown chart";
      after = [ "network.target" "tailscaled.service" ];
      wants = [ "tailscaled.service" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "simple";
        WorkingDirectory = cfg.package;
        StateDirectory = "burndown";
        Environment = [
          "PORT=${toString cfg.port}"
          "HOST=127.0.0.1"
          "ORIGIN=${cfg.origin}"
          "BURNDOWN_CACHE_PATH=/var/lib/burndown/notion-cache.json"
        ];
        EnvironmentFile = cfg.envFile;
        ExecStart = "${pkgs.deno}/bin/deno run -A build/index.js";
        Restart = "on-failure";
        RestartSec = 5;
        DynamicUser = true;
      };
    };

    systemd.services.burndown-tailscale-serve = lib.mkIf cfg.tailscaleServe {
      description = "Configure tailscale serve for burndown";
      after = [ "tailscaled.service" "burndown.service" ];
      wants = [ "tailscaled.service" ];
      wantedBy = [ "multi-user.target" ];
      path = [ pkgs.tailscale pkgs.jq ];
      script = ''
        while ! tailscale status --json 2>/dev/null | jq -e '.Self.Online' > /dev/null 2>&1; do
          sleep 5
        done
        tailscale serve --bg --yes --https=${toString cfg.serveHttpsPort} \
          http://localhost:${toString cfg.port}
      '';
      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };
    };
  };
}
