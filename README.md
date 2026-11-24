# satotek-blog

[satotek.dev](https://satotek.dev) のWebアプリケーションです。Vite+ と [Void](https://void.cloud) を使い、Cloudflare Workersへデプロイします。

本番の `satotek.dev` をこのリポジトリから直接デプロイできる構成にしています。

- トップページ、プロフィール、Last.fm の再生記録（`/music`）
- Void の `pages/`（画面）と `routes/`（API）のファイルベースルーティング
- `/posts/[slug]` の記事ルート
- カテゴリ／タグ一覧と記事一覧、`/page/N` のページ送り
- `robots.txt`、サイトマップ、RSS、`llms.txt`、`security.txt`
- `src/content/posts/<slug>/index.mdx` のfrontmatter付きMDX記事
- 記事タイトル・カテゴリ・タグから生成する1200×630のOGP画像
- レスポンシブ対応、キーボードフォーカス、OSのダークモード対応

記事データは `PostRepository` の境界越しに取得しています。現在はGit管理のMDXをViteのglob importで取り込み、frontmatterを検証したうえで、ビルド時にReactコンポーネントと目次へ変換しています。画面とテキスト配信物はビルド時に静的HTMLへ書き出し、ブラウザではページ全体を hydrate して、サイト内の移動を Void Router のクライアント遷移にしています。`/api/*` と一部の loader だけが Worker で動きます。CMSを導入する場合も、画面ルートから取得元を切り離したままアダプターを追加できます。

## 技術スタック

- Vite+ 1.7 — `vp dev` / `vp build` / `vp check` / `vp test` / `vp staged` で開発サーバー・ビルド・フォーマット・Lint・型検査・テスト・コミットフックをまとめて扱う
- Void 1.11 — ページ（通常ページと `.server.ts` の loader、Void Router）、`/api/*` の Hono ルート、静的書き出し、Cloudflare へのデプロイ
- React 19 / TypeScript 7.0
- pnpm 12 / Node.js 26 — パッケージ管理とスクリプト実行。Nix の devShell と direnv で用意する
- sops（GCP KMS）— シークレットを暗号化して Git で管理する
- Tailwind CSS 4 — ViteプラグインでユーティリティCSSを生成
- React Aria Components — キーボード操作・フォーカス管理を考慮した操作部品
- lucide-react — RSS、メニュー、テーマ切替などのUIアイコン
- Simple Icons — GitHub、X、Instagramなどのブランドアイコン

## 開発

Node.js・pnpm・sops は `flake.nix` の devShell にあり、direnv（`.envrc`）が読み込みます。pnpm は `package.json` の `packageManager` に書いた版へ自動で切り替わります。

```sh
direnv allow
gcloud auth application-default login  # secrets.sops.env の復号に使う
pnpm install
pnpm run dev
```

開発サーバーは `http://localhost:3000` で起動します。

### 環境変数

| ファイル           | 中身                                                                                   | Git        |
| ------------------ | -------------------------------------------------------------------------------------- | ---------- |
| `public.env`       | ブラウザへ公開してよい値（`VITE_*`）。ビルドに埋め込む                                 | 管理する   |
| `secrets.sops.env` | GA4・Last.fm などのシークレット。sops で GCP KMS の鍵（dotfiles と同じ）を使って暗号化 | 管理する   |
| `.env`             | `.envrc` が作る、キー名だけのファイル                                                  | 管理しない |

direnv はどちらも環境変数に載せ、復号した値をファイルには書きません。Void の開発サーバーは `.env` にあるキーだけをローカルの Worker に渡し、値はシェルのもので上書きするので、`.env` にはキー名だけを置きます。Void は `.env` 以外の `.env.*` や `.dev.vars` があるとビルドを止めるため、ファイル名はこの形にしています。

シークレットを足す・変えるときは `sops secrets.sops.env` で編集し、本番の Worker `satotek` へまとめて登録します。

```sh
sops secrets.sops.env
pnpm run secrets:push
```

`secrets:push` は値を引数に載せず一時ファイル経由で `cf workers secrets bulk-edit` に渡します。ファイルに無いシークレットは消しません。`void secret put` は `env.ts` が無いと本番の値を受け付けないため使いません。

### Analytics

本番では次の2つを使います。

- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) — ゾーン側ダッシュボードで有効化します。Cookie を使わず、このリポジトリに測定IDは不要です。ブラウザへは Cloudflare がビーコンを自動挿入します。
- [Google Analytics 4](https://developers.google.com/analytics) — ビルド時の `VITE_GA_MEASUREMENT_ID` で gtag を埋め込みます。測定IDはブラウザへ公開される値なので、Worker Secret ではなく環境変数です。

測定IDは `public.env` の `VITE_GA_MEASUREMENT_ID` です。Void のビルドは `.env` の `VITE_*` を埋め込まず、シェルの環境変数だけを使います。direnv が `public.env` を環境変数に載せるので、`pnpm run build` と `pnpm run deploy` にはそのまま入ります。Workers Builds ではビルド設定の環境変数で渡します。

ホームページの人気記事は、表示後に `GET /api/posts/popular` を取ります。サイトの Worker が GA4 Data API の `screenPageViews` で、直近7日間の `/posts/<slug>` を PV 降順で最大10件並べ、順位だけを返します。閲覧数はレスポンスに含めません。GA4 の認証情報は Worker `satotek` の Secret からのみ読み、ブラウザへは渡しません。認証情報が未設定、取得失敗、該当記事が無いときは、人気記事の欄は出ません。ビルド済みの HTML にも載せていません。

記事一覧 `/posts` の検索窓は `GET /api/search?q=` を呼び、タイトル・タグ・カテゴリ・説明から探します。検索語は `?q=` に残るので、そのまま共有できます。

記事ページの見出しの下には、`GET /api/posts/<slug>/views` で公開以来の累計閲覧数を出します。同じく GA4 の `screenPageViews` を Worker が読み、1時間キャッシュします。取得できないとき、または 0 回のときは表示しません。

GA4 の認証情報（`GA4_PROPERTY_ID`、`GA4_CLIENT_EMAIL`、`GA4_PRIVATE_KEY`）は `secrets.sops.env` にあります。サービスアカウントには対象GA4プロパティの閲覧権限が要ります。`GA4_PRIVATE_KEY` は改行を `\\n` にした1行で書きます。

ホームを含むページは prerender した HTML のままです。人気記事の順位だけ、表示後に API から足します。

### 音楽（Last.fm）

`/music` は Last.fm の公開プロフィールから、再生中の曲、直近の再生、直近7日の再生回数、アーティストと曲の上位を表示します。ブラウザは `GET /api/music` だけを呼び、API キーは Worker から Last.fm へ出します。対象ユーザーは `nosuke912` です。キーが未設定、または取得に失敗したときは、その欄を出しません。

API キー `LASTFM_API_KEY` は `secrets.sops.env` にあります。

### GitHub の最近の活動

`/profile` の GitHub 欄は `GET /api/github` を取ります。Worker が `satotek` の公開イベントを読み、push・PR・Issue・リリース・Star などを最大8件の一行にまとめて10分キャッシュします。同じリポジトリへの続けての push は1行にまとめます。取得に失敗したとき、活動が無いときは欄を出しません。

トークンは無くても動きますが、未認証だと GitHub API は IP ごとに 60 回/時です。上限に当たるようなら、権限なしの fine-grained token を `GITHUB_TOKEN` として `secrets.sops.env` に足し、`pnpm run secrets:push` で登録します。

読み取りはユーザー認証不要です。共有シークレットは使いません。別のユーザーを見るときは `LASTFM_USERNAME` で上書きできます。応答は Worker で約60秒キャッシュします。

### 記事・サイト画像（R2）

記事画像の原本は、記事の隣の `src/content/posts/<slug>/assets/` に置いてGitで管理します。配信はCloudflare R2の `satotek-media` バケットから行い、公開用カスタムドメインは `https://img.satotek.dev` です。faviconやPWA用アイコンなど、アプリの静的アセットだけは `public/` に残します。

MDXでは原本を相対パスで参照します。ビルド時に原本から実寸を読み取り、`https://img.satotek.dev/<slug>/<file>` のURLとレスポンシブ用の `srcset` へ置き換えます。記事自身の `assets/` 以外を指す相対パスや、存在しないファイルはビルドエラーになります。

```md
![写真](./assets/photo.webp)
```

R2へのアップロードは、WranglerでCloudflareにログインした状態（`pnpm exec wrangler login`）で次のように実行します。オブジェクトへ `Cache-Control` を付けるため、アップロードには Wrangler を使います。

```sh
# 全記事の assets/ を <slug>/<file> のキーでまとめてアップロード
pnpm run upload-media --posts

# 1記事の assets/ だけをアップロード
pnpm run upload-media --post <slug>

# 1枚アップロード。keyはR2上の公開パス
pnpm run upload-media --file path/to/photo.webp --key site/photo.webp

# Git管理外の .r2-media/ 以下を相対パスのまままとめてアップロード
pnpm run upload-media --directory .r2-media
```

`pnpm run deploy` はWorkerのデプロイだけを行い、画像を自動アップロードしません。画像を追加・差し替えたときは先に `pnpm run upload-media` を実行します。`upload-media` はS3 APIキーを直接扱わず、WranglerのCloudflare OAuth（CIでは `CLOUDFLARE_API_TOKEN`）を利用します。バケットを変更する場合は `R2_BUCKET_NAME` で上書きできます。

`upload-media` は元画像に加えて、幅320 / 480 / 768 / 1200pxのAVIFとWebP派生画像も同時にアップロードします。サイト側はR2上の画像に両形式の派生画像がそろっている前提で `picture` と `srcset` を出すため、記事画像は必ず派生画像付きでアップロードしてください。`--no-variants` は、ページから画像として表示しないファイルにだけ使います。

公開URLで既に200が返るキーは、派生画像の生成ごとスキップします。画像は `immutable` で配信しているため、同じキーに上書きしてもキャッシュ済みの閲覧者には届きません。画像を差し替えるときはファイル名を変えてください。どうしても上書きしたいときは `--force` を付けます。通常のビルドやデプロイでは、R2から画像を取得したり派生画像を生成したりしません。

`public/_headers` では、Viteが生成するハッシュ付きアセットと、ファイル名を固定して運用するフォントへ `Cache-Control: public, max-age=31536000, immutable` を付けています。Cloudflare Workersの静的アセットはCloudflare側でキャッシュされ、テキスト系のレスポンスは対応クライアントへ圧縮して配信されます。

### OGP画像（任意）

記事ごとのOGP画像は `satori` と `@resvg/resvg-js` で生成し、Cloudflare R2へ `blog/ogp/<slug>.png` としてアップロードできます。生成処理はWorkerでは実行せず、ローカルまたはGitHub Actionsで実行します。

まずR2バケットと、オブジェクトの読み書きができるS3 APIトークンを用意してください。R2のS3互換エンドポイントはアカウントIDから自動で組み立てます。

```sh
# まずローカルで画像を確認する（.ogp/ に出力）
pnpm run generate-ogp:all

# R2へ初回アップロードする
R2_ACCOUNT_ID=... \
R2_ACCESS_KEY_ID=... \
R2_SECRET_ACCESS_KEY=... \
R2_BUCKET_NAME=... \
pnpm run generate-ogp:upload
```

R2の公開用カスタムドメインを用意したら、デプロイ時の環境変数に設定します。

```sh
VITE_OGP_BASE_URL=https://img.satotek.dev
```

既存のR2メディアバケットに紐づく `img.satotek.dev` を使用し、記事ページは `https://img.satotek.dev/blog/ogp/<slug>.png` を `og:image` として使用します。未設定の場合は、R2上の `https://img.satotek.dev/site/og-image.png` にフォールバックします。

記事が`main`へマージされると、`.github/workflows/generate-ogp.yaml` が変更された記事だけを生成してR2へアップロードします。GitHubリポジトリには次のActions Secretsを登録してください。

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## Cloudflare Workersへのデプロイ

Worker の設定は `void.config.ts` の `worker` と `cloudflare` にあり、`void deploy` が読みます。Worker名は `satotek`、Custom Domainは `satotek.dev` です。ページは静的アセット、`/api/*` と loader を持つページ（`/play/crash` など）は同じ Worker で動きます。API 用の別 Worker はありません。

> `pnpm run deploy` はステージングではなく、本番の `satotek.dev` を更新します。実行するCloudflareアカウントが、現在のWorkerとドメインを管理していることを確認してください。

初回は Cloudflare にサインインし、接続先に Cloudflare を選びます。以降は `.void/project.json` に保存された接続先を使います。

```sh
pnpm install
pnpm exec void cloudflare login
pnpm run deploy --platform cloudflare
```

2回目からは次の1つで済みます。

```sh
pnpm run deploy
```

`pnpm run deploy` は、記事サマリの生成、Vite+のチェック、テスト、ビルドのあと、`void deploy` で Worker `satotek` を更新します。Void はアップロード後に新しい版の応答を確かめてから切り替えます。

### TanStack Start・Elysia 版からの移行

旧構成はサイト Worker `satotek`（TanStack Start、`cf deploy`）と、`satotek.dev/api/*` を受ける API Worker `satotek-api`（Elysia）の2つでした。切り替えるときは次の順に進めます。

1. `pnpm run secrets:push` で、`satotek-api` に登録していた `GA4_PROPERTY_ID`、`GA4_CLIENT_EMAIL`、`GA4_PRIVATE_KEY`、`LASTFM_API_KEY`、`GITHUB_TOKEN` を Worker `satotek` に登録する。
2. `void deploy --platform cloudflare` でデプロイする。既存の `satotek` は Void 製ではないため、紐付けの確認が出たら内容を読んでから進める。
3. `satotek.dev/api/*` のルートを `satotek-api` から外す。残っていると、`/api/*` が新しい Worker まで届かない。
4. 動作を確かめたら `satotek-api` を削除する。

APIキー、秘密鍵、サービスアカウント認証情報などは、平文でリポジトリへ追加しないでください。`secrets.sops.env` に暗号化して置きます。

旧サイトで使っていたリアクション・PV用のD1は、新アプリケーションからは参照していません。このリポジトリのデプロイ処理にD1データベースを削除する操作は含まれていません。

## 検証

```sh
pnpm run check
pnpm run test
pnpm run build
pnpm run preview
```

`pnpm run check` は記事サマリの生成と、Vite+によるリポジトリ全体のフォーマット・Lint・TypeScriptの型検査を実行します。`pnpm run test` は Vite+ のテストランナー（`vite-plus/test`）で一度だけテストを実行します。`pnpm run dev` は起動時に記事サマリを生成してから開発サーバーを起動し、起動後も `src/content/posts/*/index.mdx` の変更を検知して再生成・ブラウザ更新を行います。OGP画像の生成は `pnpm run generate-ogp:all` で個別に実行します。

依存関係は Dependabot が毎週更新 PR を作ります（`.github/dependabot.yml`）。パッチ・マイナー更新は1本の PR にまとめ、描画結果が変わり得る `satori` と Vite+ の catalog は個別の PR にします。pnpm のバージョンは `package.json` の `packageManager`、Node.js のバージョンは `.node-version` で指定し、CI もそこから読みます。ローカルの pnpm と Node.js は Nix で入れているため、上げるときは nixpkgs の版と揃えてください。

`pnpm install` 時の `prepare`（`vp config`）で `.vite-hooks/` の Git フックが設定されます。コミット時には pre-commit フックが `vp staged` を実行し、ステージした JS/TS ファイルへ `vp check --fix` をかけます。

### WebMCP PoC

対応ブラウザでは、次のWebMCPツールを共通ルートから登録します。

- `search_posts({ query, limit? })` — タイトル・説明・カテゴリ・タグを検索
- `list_posts({ category?, tag?, limit? })` — 公開記事を条件付きで一覧
- `open_post({ slug })` — 公開記事を現在のタブで開く

WebMCP非対応ブラウザでは何もせず、通常のサイトとして動作します。ローカルで試す場合はChromeで `chrome://flags/#enable-webmcp-testing` を有効にしてから `http://localhost:3000` を開き、Model Context Tool Inspectorなどでツールを確認してください。

Chrome Origin Trialを使う場合は、対象origin用のトークンを `public.env` の `VITE_WEBMCP_ORIGIN_TRIAL_TOKEN` に設定します。この値はページへ公開されるため、秘密情報として扱う必要はありません。

## ディレクトリ構成

```text
void.config.ts              head、リダイレクト、Worker と Cloudflare の設定
pages/                      画面。*.tsx が描画、*.server.ts がビルド時（または Worker）の loader
routes/                     /api/* の Hono ルート。処理は src/server/api/service.ts に寄せる
scripts/                    記事サマリ・OGP画像の生成、R2へのアップロード
└── ogp/                    OGPカードの描画（レイアウトのテスト付き）
vite-plugins/               MDXの画像解決、記事の監視、feed.xml などの静的書き出し
└── content-pipeline/       MDXのビルド時変換と画像処理（ビルド時だけ使う）
public/                     favicon、フォント、_headers
src/
├── analytics/              ブラウザの計測
├── components/
│   ├── article/            記事本文の構成部品（MDXのcomponentsマップ、目次）
│   ├── games/              隠しゲーム（規則は描画から分けてテストする）
│   ├── listening/          音楽ページとサイドバーの再生記録
│   └── ui/                 React Ariaを使う操作部品
├── content/                散文のみ
│   ├── posts/              Git管理するMDX記事と、記事ごとの assets/ 画像原本
│   └── .generated/         ビルド時に生成する一覧用サマリ
├── core/                   記事の検索・型、音楽・GitHub・GA4 の型など。React にも Worker にも依存しない
├── data/                   ナビゲーションとカテゴリ・タグの集計
├── islands/                ブラウザの API や状態を使う部品（island 構成だった頃の名残の置き場所）
├── lib/
│   └── posts/              PostRepositoryとMDXソースの読み込み
├── server/                 RSS、サイトマップ、robotsなどのレスポンス生成
│   └── api/                /api/* の処理と GA4・Last.fm・GitHub の取得
├── webmcp/                 WebMCPツールの定義と登録
├── styles/                 領域ごとのCSS（トークン、本文、コードの色分け、ナビゲーション、遷移など）
└── styles.css              Tailwind CSSのエントリーポイント。styles/ を順に読み込む
```

`routes/api/*` は1行で `src/server/api/service.ts` を呼ぶだけにしています。HTTP の組み立て（キャッシュ、エラー変換）は `routes/_api.ts`、処理本体は Hono に依存しない `createApi()` に分けて、テストでは取得処理を差し替えて確かめます。

`scripts/generate-post-summaries.ts` は公開記事のfrontmatterを検証し、一覧用のサマリを `src/content/.generated/` に生成します。本文と目次はMDXモジュール自身が持つため、ここでは書き出しません。変換系の依存関係は `vite-plugins/content-pipeline` だけが使い、すべて devDependencies に置いています。`scripts/generate-ogp.tsx` は記事のタイトル・カテゴリ・タグをOGPカードに描画し、ローカルPNGまたはR2へ出力します。`scripts/upload-media.ts` は記事の画像原本や `.r2-media/` の画像を派生画像と一緒にR2へアップロードします。生成先の `src/content/.generated/`、`.ogp/`、`.r2-media/`は生成物またはローカル作業用のためGit管理しません。`pnpm run build` のprerender処理で、記事・一覧・カテゴリ・タグ・RSSなどのHTML／テキストを `dist/client` に出力します。

## 今後の拡張方針

まずはGit管理のMDXを記事のsource of truthとして運用します。

- Headless CMSは、複数人編集・Web上の執筆・承認フローなどが必要になった段階でRepositoryアダプターとして追加する
- 公開の読み取り API は `routes/api/`（Hono）が担当する。管理 API や Webhook、D1 を使う機能も、要件が出た段階で同じ Worker に足す
