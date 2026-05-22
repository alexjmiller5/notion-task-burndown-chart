{
  description = "Notion task burndown chart — service module + hermetic build";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-linux" "x86_64-linux" "aarch64-darwin" "x86_64-darwin" ];
      forAll = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAll (sys: {
        default = nixpkgs.legacyPackages.${sys}.callPackage ./package.nix { };
      });
      nixosModules.default = import ./module.nix { inherit self; };
    };
}
