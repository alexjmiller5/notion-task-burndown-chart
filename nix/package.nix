{ pkgs, lib }:
let
  src = ../.;

  denoCache = pkgs.stdenv.mkDerivation {
    pname = "burndown-deno-cache";
    version = "0.1.0";
    inherit src;
    nativeBuildInputs = [ pkgs.deno ];

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = "sha256-oeQZlOevZbvuC896C0EBC+oCFHxCOh/LfPTZoTTM8Sg=";

    buildPhase = ''
      runHook preBuild
      export DENO_DIR=$out/.deno
      export HOME=$TMPDIR
      mkdir -p $out
      cd $TMPDIR
      cp -r $src/. .
      deno install --allow-scripts --frozen
      cp -r node_modules $out/node_modules
      runHook postBuild
    '';

    installPhase = "true";
    dontStrip = true;
    dontFixup = true;
  };
in
pkgs.stdenv.mkDerivation {
  pname = "notion-task-burndown-chart";
  version = (lib.importJSON ../package.json).version or "0.1.0";
  inherit src;
  nativeBuildInputs = [ pkgs.deno ];

  buildPhase = ''
    runHook preBuild
    export DENO_DIR=$TMPDIR/deno-cache
    cp -r ${denoCache}/.deno $DENO_DIR
    chmod -R +w $DENO_DIR
    cp -r ${denoCache}/node_modules ./node_modules
    chmod -R +w node_modules
    deno run --cached-only -A npm:vite build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out
    cp -r build $out/build
    cp -r node_modules $out/node_modules
    cp package.json deno.json deno.lock $out/
    runHook postInstall
  '';
}
