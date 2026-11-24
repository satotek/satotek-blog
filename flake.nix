{
  description = "satotek.dev development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26
            # pnpm は package.json の packageManager に書いた版へ自動で切り替わる。
            # ここでは起動役として入れ、版はリポジトリ側で一つに固定する。
            pnpm
            jq
            sops
          ];
        };
      });
    };
}
