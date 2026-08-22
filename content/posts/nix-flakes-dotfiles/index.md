---
title: dotfiles を Nix Flakes で管理している話
date: 2026-07-04
description: macOS・Linux・WSL・Azure VM の環境を Nix Flakes + Home Manager に寄せた話。設定の書き分け、シェル起動の高速化、AI エージェント設定の宣言管理、flake.lock の自動更新まで。
category: tech
draft: false
tags:
  - Nix
  - Home Manager
  - nix-darwin
  - dotfiles
  - zsh
  - Claude Code
---

私の dotfiles は Nix Flakes で管理しています。

リポジトリはこちらです: [satotek/dotfiles](https://github.com/satotek/dotfiles)

2025年の終わり頃に作り始めて、半年ほど運用してきました。最初はよくある「シェルスクリプトで symlink を張るインストーラ」方式だったのですが、途中で丸ごと Nix に寄せて、今はインストーラスクリプトは残っていません。

この記事では、なぜ Nix にしたのか、どういう構成にしているのか、運用してみてどうだったかを書いていきます。

## なぜ Nix にしたのか

一番の理由は、環境が増えたことです。

普段使いの macOS に加えて、WSL、それから作業用の Azure VM（Ubuntu）と、同じ設定を使いたいマシンが気づけば増えていました。シェルスクリプトのインストーラでもある程度は対応できるのですが、

- OS ごとの分岐がスクリプト内にどんどん増えていく
- 「このツール入ってなかった」を実行時に踏んでから気づく
- 何度実行しても同じ状態になる（冪等性）の保証を自前で頑張る必要がある

あたりがつらくなってきます。特に CLI ツールのインストールは、Homebrew・apt・cargo・npm と入れ方がバラバラで、マシンごとに微妙に違う環境ができあがりがちでした。

Nix はこのあたりを仕組みごと解決してくれます。パッケージも設定ファイルも全部宣言的に書いて、`switch` 一発で「宣言どおりの状態」に収束させる。分岐は Nix の式として書けるので、OS ごとの差分も構造として整理できます。

### mise じゃだめだったのか

選定の段階では [mise](https://mise.jdx.dev/) も有力候補でした。`mise.toml` にツール名とバージョンを書くだけで揃う手軽さは魅力ですし、学習コストは Nix とは比べものにならないくらい低い。「CLI ツールをマシン間で揃える」ことだけが目的なら、mise のほうが早く幸せになれると思います。

それでも Nix を選んだのは、半分は合理で、半分はノリです。

合理の部分は守備範囲です。mise が担当するのはツールのバージョン管理までですが、Nix + Home Manager はそれに加えて、設定ファイルの配置、シェルの中身、macOS のシステム設定（nix-darwin）までを同じ仕組みで宣言できます。dotfiles 全体を1つの流儀に寄せたかったので、ここは大きな差でした。

ノリの部分は、「パッケージのビルドを純粋関数として扱う」という Nix の考え方が単純に面白そうだったことです。同じ入力（宣言と `flake.lock`）からは必ず同じ環境が出てくる。関数型プログラミングの発想がそのまま環境構築になっているのは、触っていて普通に楽しいです。あとは正直に言うと、当時 X のタイムラインで Nix がなにかと流行っていて、乗ってみたくなったというのもあります。動機なんてそんなものです。

## 全体構成

macOS では `nix-darwin + Home Manager`、Linux では standalone の `Home Manager` を使っています。

```text
dotfiles/
├── flake.nix                 # 全マシンの構成のエントリポイント
├── nix/
│   ├── home-manager/
│   │   ├── default.nix       # 共有 Home Manager 設定の入口
│   │   ├── data/             # ツール横断で共有する純データ (mcp-servers.nix など)
│   │   ├── home/             # シェル・プロファイル・migration などのコア設定
│   │   ├── platforms/        # darwin.nix / linux.nix
│   │   ├── presets/          # パッケージのまとまり: base / devtools / webdevtools
│   │   └── programs/         # ツールごとに1ファイル (git, zsh, nvim, claude-code, ...)
│   ├── hosts/                # マシン(ユーザー)ごとの定義
│   └── nix-darwin/           # macOS システム層 (Homebrew casks, macOS 設定)
├── .config/                  # リポジトリ直置きの設定ファイル (nvim, ghostty, starship, ...)
└── .github/workflows/        # flake.lock の自動更新 CI
```

macOS で使うときのポイントは、システム層とホーム層の2層に分かれていることです。

- **システム層（nix-darwin）**: Homebrew の cask、フォント、macOS のシステム設定。`sudo` が要る層
- **ホーム層（Home Manager）**: それ以外ぜんぶ。CLI ツール、シェル、各ツールの設定。`sudo` 不要

日々いじるのはほぼホーム層だけで、こちらは `nix-switch` というエイリアス一発で反映できます。cask や macOS 設定を変えたときだけ `darwin-switch`（sudo あり）を叩く運用です。

マシンの定義は `flake.nix` に集約していて、macOS・Linux (x86_64 / aarch64)・WSL・Azure VM 用に 8 つの homeConfiguration を出力しています。共通部分は `mkHomeConfiguration` という関数にまとめてあるので、マシンが増えても数行足すだけです。

```nix title="flake.nix"
homeConfigurations."${darwinUsername}@${darwinHostname}" = mkHomeConfiguration {
  system = darwinSystem;
  userName = darwinUsername;
  homeDirectory = "/Users/${darwinUsername}";
  extraModules = [
    ./nix/home-manager/platforms/darwin.nix
    ./nix/home-manager/presets/base.nix
    ./nix/home-manager/presets/devtools.nix
    ./nix/home-manager/presets/webdevtools.nix
  ];
};
```

パッケージは `presets/` で「どのマシンにも入れる base」「開発マシン用の devtools」「Web 開発用の webdevtools」に分けています。Azure VM のような用途が限られたマシンには base だけ、みたいな組み合わせができるのが地味に便利です。

## 設定ファイルの持ち方は2種類に使い分け

Home Manager で設定を管理する方法は大きく2つあって、これの使い分けが運用上けっこう重要でした。

**1. Home Manager のネイティブオプションで書く**

`git`、`tmux`、`zsh` あたりはこちらです。設定が Nix の式になるので、変数や条件分岐が使えて、他の設定と値を共有できます。

**2. リポジトリ内のファイルを `mkOutOfStoreSymlink` で直接リンクする**

```nix title="nix/home-manager/programs/starship.nix"
xdg.configFile."starship.toml".source =
  config.lib.file.mkOutOfStoreSymlink "${dotfilesDir}/.config/starship.toml";
```

Neovim、Ghostty、Starship、WezTerm など、試行錯誤しながら頻繁にいじる設定はこちらです。

普通に Home Manager でファイルを管理すると、設定は Nix ストアにコピーされるので、1行変えるたびに `switch`（再ビルド）が必要になります。`mkOutOfStoreSymlink` を使うとリポジトリのファイルへの symlink になるので、**エディタで保存した瞬間に反映**されます。Neovim の設定をいじるたびにビルドを待つのは現実的ではないので、この使い分けに落ち着きました。

「変更頻度が低くて構造化の恩恵が大きいものはネイティブオプション、変更頻度が高いものは直リンク」という基準です。

## プロジェクトごとの環境は flake + direnv

ここまではマシン全体の環境の話ですが、プロジェクトごとに必要なツールチェーンは、dotfiles ではなく各リポジトリの `flake.nix` + [direnv](https://direnv.net/) で管理しています。mise でいうプロジェクトごとのツール切り替えに相当する部分です。

リポジトリに devShell を定義した `flake.nix` と、`use flake` と書いた `.envrc` を置いておくと、そのディレクトリに `cd` した瞬間に必要なツールが PATH に入り、離れると消えます。

```nix title="flake.nix（プロジェクト側・抜粋）"
devShells.default = pkgs.mkShell {
  packages = with pkgs; [ nodejs_22 pnpm terraform ];
};
```

```sh title=".envrc"
use flake
```

素の direnv + Nix の組み合わせは `cd` のたびに flake の評価が走って遅いのですが、[nix-direnv](https://github.com/nix-community/nix-direnv) を挟むと評価結果がキャッシュされて2回目以降は一瞬になります。この direnv 自体の設定も Home Manager で宣言しています。

```nix title="nix/home-manager/programs/direnv.nix"
programs.direnv = {
  enable = true;
  enableZshIntegration = true;
  nix-direnv.enable = true;

  config.global = {
    # flake の初回評価は数秒かかるので「読み込みが遅い」警告を出さない
    warn_timeout = "0s";
    # cd 毎の `export +FOO +BAR ...` 差分表示を隠す
    hide_env_diff = true;
  };
};
```

「グローバルに入れるのは dotfiles で宣言したツールだけ、プロジェクト固有のものはリポジトリの flake に書く」と分けておくと、マシン全体は汚れませんし、プロジェクトを行き来しても `cd` するだけで正しいツールチェーンに切り替わります。

## シェルの起動を速くする工夫

Zsh のプラグインマネージャは [sheldon](https://sheldon.cli.rs/) を使っています。以前は zinit を使っていたのですが、本家リポジトリが突然消えて community fork（zdharma-continuum）に引き継がれた騒動があったこと、TOML に書くだけという設定の楽さ、そして最近なにかと流行っていたこともあって、sheldon に乗り換えました。

sheldon はプラグインを `plugins.toml` に書くだけです。zinit の turbo mode に相当する遅延読み込みも、zsh-defer を通す template を1つ定義すれば再現できます。

```toml title=".config/sheldon/plugins.toml（抜粋）"
[templates]
defer = "{{ hooks?.pre | nl }}{% for file in files %}zsh-defer source \"{{ file }}\"\n{% endfor %}{{ hooks?.post | nl }}"

[plugins.fast-syntax-highlighting]
github = "zdharma-continuum/fast-syntax-highlighting"
use = ["fast-syntax-highlighting.plugin.zsh"]
apply = ["defer"]
```

「設定は TOML に宣言、読み込みは遅延」という形に整理できて、dotfiles 全体を宣言的に寄せている方針とも噛み合っています。

プロンプトは starship、ディレクトリ移動は zoxide です。sheldon も含めて、この手のツールは起動時に `eval "$(starship init zsh)"` のように init スクリプトを毎回生成させるのが定番です。ただ、これが積み重なるとシェルの起動が目に見えて遅くなります。

そこで、生成結果をファイルにキャッシュして、設定ファイルより古くなったときだけ再生成するようにしています。この仕組みは「[究極のzshプラグイン読み込み高速化: プラグインマネージャーの限界を越えろ](https://zenn.dev/fuzmare/articles/zsh-plugin-manager-cache)」を参考にしたものです。

```zsh title=".zshrc（zsh.nix が生成・抜粋）"
if [[ -n "$_zoxide_bin" && ( ! -r "$_zoxide_cache" || "$_zoxide_bin" -nt "$_zoxide_cache" ) ]]; then
  "$_zoxide_bin" init zsh >| "$_zoxide_cache"
fi
[[ -r "$_zoxide_cache" ]] && source "$_zoxide_cache"
```

ほかにも、

- `source` をフックして読み込むスクリプトを自動で `zcompile`（Zsh のバイトコンパイル）
- `compinit`（補完の初期化）は macOS では `zsh-defer` でプロンプト表示後に遅延実行

といった細かい積み重ねで、プラグインを盛っているわりに起動は軽く保てています。

実際どれくらいなのか、[hyperfine](https://github.com/sharkdp/hyperfine) で測ってみました。hyperfine 自体も `nix run` で一時的に呼び出せるので、インストール不要です。

```sh
nix run nixpkgs#hyperfine -- --warmup 3 'zsh -i -c exit'
```

手元の M5 MacBook Pro での結果は **46 ms ± 8 ms** でした。比較のため、実行のたびにキャッシュを削除する（= 毎回 init スクリプトを生成する素の状態に相当）条件でも測ると 74 ms だったので、30 ms 弱をキャッシュで稼いでいる計算です。さらに `compinit` や syntax highlighting などの重い処理は `zsh-defer` でプロンプト表示後に回しているので、体感の「入力できるようになるまで」はこの数字よりさらに短くなっています。

### 落とし穴: nix-darwin のグローバル compinit

実はこの記事を書きながら測ったとき、最初は 105 ms でした。zprof でプロファイルしても自分の `.zshrc` は 40 ms 分ほどしか使っていない。残りはどこだと犯人を探したら、nix-darwin が生成する `/etc/zshrc` でした。

```zsh title="/etc/zshrc（nix-darwin が生成・抜粋）"
autoload -U promptinit && promptinit && prompt suse && setopt prompt_sp
autoload -U compinit && compinit
autoload -U bashcompinit && bashcompinit
```

nix-darwin で `programs.zsh.enable = true` にすると、デフォルトでは **キャッシュを使わないフルの `compinit`** と、starship にどうせ上書きされるプロンプト初期化が、自分の `.zshrc` が始まる前に毎回走ります。ユーザー側でどれだけ compinit を遅延・キャッシュしても、その手前で毎回フル初期化されていたわけです。

nix-darwin 側でこう無効化しました。補完はユーザー側の遅延 compinit が担うので機能は失われません。

```nix title="nix/nix-darwin/system.nix"
programs.zsh.enable = true;
programs.zsh.enableGlobalCompInit = false;
programs.zsh.enableBashCompletion = false;
programs.zsh.promptInit = "";
```

これだけで **105 ms → 46 ms** になりました。`.zshrc` をどれだけ磨いてもグローバル側の `/etc/zshrc` は見落としがちです。nix-darwin に限らず、`NOSYSZSHRC=1 zsh -i -c exit` と比べて差が大きいときはグローバル設定を疑ってみてください。

## AI エージェントの設定も Nix で管理する

最近の dotfiles らしいところだと思うのですが、Claude Code や Codex といったコーディングエージェントの設定もすべて Nix で宣言管理しています。

```nix title="nix/home-manager/programs/claude-code.nix"
programs.claude-code = {
  enable = true;
  package = pkgs.llm-agents.claude-code;

  settings = {
    outputStyle = "Explanatory";
    model = "claude-opus-4-8";
    permissions.allow = [
      "Bash(pnpm typecheck)"
      "Bash(pnpm test)"
      # ...
    ];
  };
};
```

エージェント本体は [llm-agents.nix](https://github.com/numtide/llm-agents.nix) 経由でパッケージとして入れて、settings.json も permissions も statusline スクリプトも全部コードとして管理します。新しいマシンでも `switch` した時点でいつものエージェント環境が揃うのはかなり快適です。

工夫した点として、MCP サーバーの定義を「純データ」のファイルに切り出して、Claude Code と Codex の両方から共有しています。

```nix title="nix/home-manager/data/mcp-servers.nix"
# 起動方法だけを書いた純データ
{
  context7 = {
    command = "npx";
    args = [ "-y" "@upstash/context7-mcp" ];
  };
  # ...
}
```

Claude Code は settings の `mcpServers`、Codex は config.toml の `[mcp_servers]` と設定の置き場所も形式も違うのですが、大元のデータを1ファイルにしておいて、エージェント固有の項目（Claude の `type = "stdio"` など）は各 import 側で付与する方式です。MCP サーバーを1つ足すと両方のエージェントに反映されます。

Agent Skills も flake の input としてバージョン固定で取り込んでいて、Anthropic 公式や Vercel のスキル集がこれも `switch` 一発で入ります。

## flake.lock は CI が自動更新する

Nix Flakes は `flake.lock` で依存をバージョン固定するので再現性は完璧なのですが、放っておくと全部が古くなっていきます。かといって手で `nix flake update` し続けるのは面倒です。

そこで GitHub Actions で自動更新しています。ワークフローは2本です。

- **AI 系 input（毎日）**: Claude Code などのエージェント類は動きが速いので毎日更新
- **基盤系 input（3日おき）**: nixpkgs / nix-darwin / home-manager。こちらは **リリースから3日以上経った版だけを取り込む「age gate」付き** で、当日リリースの事故を踏まないようにしています

どちらのワークフローも、更新後に Linux の Home Manager 構成を実際にビルドして検証してから PR を作り、通れば自動マージします。壊れた更新が main に入らないので、各マシンでは `git pull` して `nix-switch` するだけで安心して追従できます。

リポジトリは public なので GitHub ホストランナーは無料です。dotfiles の依存更新が Dependabot 的に回り続けるのは、一度組んでしまうとかなり楽です。

## 新しいマシンのセットアップ

ここまでやった結果、新しいマシンの環境構築はこうなりました。

```bash
# Nix をインストール (Determinate Nix)
curl -fsSL https://install.determinate.systems/nix | sh -s -- install

# clone して switch
git clone https://github.com/satotek/dotfiles.git ~/dotfiles
cd ~/dotfiles
nix run home-manager/master -- switch --flake "path:$PWD#nosuke@linux-x86_64"
```

これで CLI ツールもシェルもエディタもエージェントも、いつもの環境が一式立ち上がります（macOS の場合は、これに加えてシステム層の `darwin-rebuild switch` が1コマンド増えます）。Git のユーザー名やシークレットのようなマシン固有・秘匿情報だけはリポジトリの外（`~/.config/git.local` など）に置く運用です。

実際、Azure VM を作り直すことが何度かあったのですが、環境の復元で悩むことはほぼなくなりました。

## さいごに: Nix は難しい。でも今は LLM がいる

正直に言うと、Nix の学習コストは高いです。Nix 言語は独特ですし、エラーメッセージも親切とは言えません。「dotfiles を Nix にしたい」と思って調べ始めても、flake・Home Manager・nix-darwin と概念が多くて、以前なら挫折する人が多かったジャンルだと思います。

ただ、これは LLM が出てくる前の話です。

実はこのリポジトリの設定も、かなりの部分を Claude Code に手伝ってもらいながら書いています。「starship の設定は再ビルドなしで反映されるようにしたい」「MCP サーバーの定義を Claude Code と Codex で共有したい」と日本語でやりたいことを伝えれば、Nix の式に落とすところはエージェントがやってくれます。エラーが出たらそのまま貼れば、あの不親切なエラーメッセージも解読してくれます。

Nix は宣言的なので、この進め方と相性が抜群です。生成された設定が正しいかは `switch` が通るかで機械的に検証できますし、変になってもロールバックできます。「LLM に書かせて、ビルドで検証する」というループが安全に回せるんですね。

この記事で紹介した構成も、AI エージェントの設定を Nix で管理して、その Nix を AI エージェントに書いてもらう、という循環でできています。

学習コストを理由に Nix を避けていた人は、いま一番始めやすいタイミングだと思います。手元のエージェントに「dotfiles を Nix Flakes で管理したい」と伝えるところから始めてみてください。

リポジトリはこちらです: [satotek/dotfiles](https://github.com/satotek/dotfiles)
