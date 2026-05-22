{
  description = "Burndown OCI VM — wires iac base + burndown service module";

  inputs = {
    nixpkgs.url   = "github:NixOS/nixpkgs/nixos-unstable";
    iac.url       = "github:alexjmiller5/nixos-ocp-tailscale-vm-iac";
    burndown.url  = "path:../nix";
  };

  outputs = { self, nixpkgs, iac, burndown, ... }: {
    nixosConfigurations.notion-task-burndown-chart =
      nixpkgs.lib.nixosSystem {
        system = "aarch64-linux";
        modules = [
          ./hardware-configuration.nix
          iac.nixosModules.base
          burndown.nixosModules.default
          ({ ... }: {
            networking.hostName = "notion-task-burndown-chart";
            time.timeZone = "America/New_York";
            services.burndown = {
              enable = true;
              origin = "https://notion-task-burndown-chart.tailee59b5.ts.net";
            };
          })
        ];
      };
  };
}
