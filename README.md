# satotek-blog

[satotek.dev](https://satotek.dev) のWebアプリケーションです。Vite+ と TanStack Start を使い、Cloudflare Workersへデプロイします。

本番の `satotek.dev` をこのリポジトリから直接デプロイできる構成にしています。

- トップページとプロフィールページ
- TanStack Router のファイルベースルーティング
- `/posts/$slug` の記事ルート
- カテゴリ／タグ一覧と記事一覧、`/page/N` のページ送り
- `robots.txt`、サイトマップ、RSS、`llms.txt`、`security.txt`
- `src/content/posts/<slug>/index.mdx` のfrontmatter付きMDX記事
- 記事タイトル・カテゴリ・タグから生成する1200×630のOGP画像
- レスポンシブ対応、キーボードフォーカス、OSのダークモード対応

記事データは `PostRepository` の境界越しに取得しています。現在はGit管理のMDXをViteのglob importで取り込み、frontmatterを検証したうえで、ビルド時にReactコンポーネントと目次へ変換しています。公開済みの画面とテキスト配信物は静的アセットとして配信し、将来のCMSプレビューやAPI用にTanStack StartのWorker SSRも残しています。CMSを導入する場合も、画面ルートから取得元を切り離したままアダプターを追加できます。

## 技術スタック

- Vite+ 0.2 — `vp build` / `vp check`（開発サーバーはCloudflare公式構成に合わせて `vite dev`）
- TanStack Start — SSRとルーティングのアプリケーション基盤
- TanStack Router — ファイルベースルーティング
- React 19 / TypeScript 7.0
- Bun 1.3 — パッケージ管理とスクリプト実行
- Tailwind CSS 4 — ViteプラグインでユーティリティCSSを生成
- React Aria Components — キーボード操作・フォーカス管理を考慮した操作部品
- lucide-react — RSS、メニュー、テーマ切替などのUIアイコン
- Simple Icons — GitHub、X、Instagramなどのブランドアイコン

## 開発

```sh
bun install
bun run dev
```

開発サーバーは `http://localhost:3000` で起動します。

### Analytics

本番では次の2つを使います。

- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) — ゾーン側ダッシュボードで有効化します。Cookie を使わず、このリポジトリに測定IDは不要です。ブラウザへは Cloudflare がビーコンを自動挿入します。
- [Google Analytics 4](https://developers.google.com/analytics) — ビルド時の `VITE_GA_MEASUREMENT_ID` で gtag を埋め込みます。測定IDはブラウザへ公開される値なので、Worker Secret ではなく環境変数です。

```sh
cp .env.example .env.local
# VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

`bun run deploy` は `.env.local` を読んだ Vite ビルドのあとに `wrangler deploy` します。測定IDを変えたら、再ビルドしてからデプロイしてください。ローカルで ID を空にすると gtag は出ません。

ホームページの人気記事は `AnalyticsRepository` 経由で、サーバー側のGA4 Data APIから取得します。`screenPageViews` を使い、直近7日間の `/posts/<slug>` をPV降順で最大10件取得します。GA4の認証情報はWorkerのSecretからのみ読み、ブラウザへは渡しません。認証情報が未設定・取得失敗・記事が存在しない場合は、`src/data/home.ts` の固定Pick upへフォールバックします。

ローカルでGA4連携まで確認する場合は、サービスアカウントへ対象GA4プロパティの閲覧権限を付与し、`.dev.vars` を作成します。

```sh
cp .dev.vars.example .dev.vars
```

```dotenv
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=analytics-reader@your-project.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

本番Workerには、初回だけ次のコマンドでSecretを登録します。値はプロンプトから入力され、Gitには保存されません。

```sh
bunx wrangler secret put GA4_PROPERTY_ID
bunx wrangler secret put GA4_CLIENT_EMAIL
bunx wrangler secret put GA4_PRIVATE_KEY
```

ホームは現在のGA4スナップショットをリクエスト時に表示するため、prerender対象から外しています。記事・一覧・配信物など、内容がビルド時に確定するページは引き続きprerenderされます。

### 記事・サイト画像（R2）

記事画像とサイト内のコンテンツ画像はGitに置かず、Cloudflare R2の `satotek-media` バケットから配信します。公開用カスタムドメインは `https://img.satotek.dev` です。faviconやPWA用アイコンなど、アプリの静的アセットだけは `public/` に残します。

ローカルで作業中の画像は `.r2-media/` または `src/content/posts/<slug>/assets/` に置けます。どちらもGit管理対象外です。WranglerでCloudflareにログインした状態で、次のコマンドでアップロードします。

```sh
# 1枚アップロード。keyはR2上の公開パス
bun run upload-media -- \
  --file src/content/posts/first-post/assets/photo.webp \
  --key first-post/photo.webp

# .r2-media/ 以下を相対パスのまままとめてアップロード
bun run upload-media -- --directory .r2-media
```

アップロード後、記事では出力された `https://img.satotek.dev/...` のURLを使います。

```md
![写真](https://img.satotek.dev/first-post/photo.webp)
```

`bun run deploy` はWorkerのデプロイだけを行い、画像を自動アップロードしません。画像を追加・差し替えたときは先に `bun run upload-media` を実行します。`upload-media` はS3 APIキーを直接扱わず、WranglerのCloudflare OAuth（CIでは `CLOUDFLARE_API_TOKEN`）を利用します。バケットを変更する場合は `R2_BUCKET_NAME` で上書きできます。

`upload-media` は元画像に加えて、幅320 / 480 / 768 / 1200pxのAVIFとWebP派生画像も同時にアップロードします。サイト側は `src/content/media-manifest.json` に実在する形式だけを `picture` と `srcset` で利用します。既存画像へAVIFを追加した場合は、アップロード後に `bun run generate-media-manifest` を実行して形式情報を更新してください。OGP画像など派生画像が不要なファイルは `--no-variants` を付けてください。通常のビルドやデプロイでは、R2から画像を取得したり派生画像を生成したりしません。

`public/_headers` では、Viteが生成するハッシュ付きアセットと、ファイル名を固定して運用するフォントへ `Cache-Control: public, max-age=31536000, immutable` を付けています。Cloudflare Workersの静的アセットはCloudflare側でキャッシュされ、テキスト系のレスポンスは対応クライアントへ圧縮して配信されます。

### OGP画像（任意）

記事ごとのOGP画像は `satori` と `@resvg/resvg-js` で生成し、Cloudflare R2へ `blog/ogp/<slug>.png` としてアップロードできます。生成処理はWorkerでは実行せず、ローカルまたはGitHub Actionsで実行します。

まずR2バケットと、オブジェクトの読み書きができるS3 APIトークンを用意してください。R2のS3互換エンドポイントはアカウントIDから自動で組み立てます。

```sh
# まずローカルで画像を確認する（.ogp/ に出力）
bun run generate-ogp:all

# R2へ初回アップロードする
R2_ACCOUNT_ID=... \
R2_ACCESS_KEY_ID=... \
R2_SECRET_ACCESS_KEY=... \
R2_BUCKET_NAME=... \
bun run generate-ogp:upload
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

`wrangler.jsonc` は本番用の設定です。Worker名は `satotek`、Custom Domainは `satotek.dev` になっているため、デプロイすると現在のサイトをこのアプリで置き換えます。

> `bun run deploy` はステージングではなく、本番の `satotek.dev` を更新します。実行するCloudflareアカウントが、現在のWorkerとドメインを管理していることを確認してください。

Cloudflareへログイン後、次を実行します。

```sh
bun install
bunx wrangler login
bunx wrangler whoami
bun run deploy
```

`bun run deploy` は、記事サマリの生成、Vite+のチェック、Cloudflare向けビルド、`wrangler deploy` を順に実行します。実行前にローカルで表示と主要ルートを確認してください。

`.env.local`、`.env.*`、`.dev.vars*` はGit管理対象外です。APIキー、秘密鍵、サービスアカウント認証情報などをリポジトリへ追加しないでください。GA4の測定IDは `.env.local` の `VITE_GA_MEASUREMENT_ID` で渡します。

旧サイトで使っていたリアクション・PV用のD1は、新アプリケーションからは参照していません。このリポジトリのデプロイ処理にD1データベースを削除する操作は含まれていません。

## 検証

```sh
bun run check
bun run test
bun run build
bun run preview
```

`bun run check` は記事サマリの生成と、Vite+によるリポジトリ全体のフォーマット・Lint・TypeScriptの型検査を実行します。フォント定義などの静的アセットはベンダー生成物として検査対象から外しています。`bun run test` は一度だけテストを実行し、`bun run test:watch` は監視モードで実行します。`bun run dev` は起動時に記事サマリを生成してから開発サーバーを起動し、起動後も `src/content/posts/*/index.mdx` の変更を検知して再生成・ブラウザ更新を行います。OGP画像の生成は `bun run generate-ogp:all` で個別に実行します。

### WebMCP PoC

対応ブラウザでは、次のWebMCPツールを共通ルートから登録します。

- `search_posts({ query, limit? })` — タイトル・説明・カテゴリ・タグを検索
- `list_posts({ category?, tag?, limit? })` — 公開記事を条件付きで一覧
- `open_post({ slug })` — 公開記事を現在のタブで開く

WebMCP非対応ブラウザでは何もせず、通常のサイトとして動作します。ローカルで試す場合はChromeで `chrome://flags/#enable-webmcp-testing` を有効にしてから `http://localhost:3000` を開き、Model Context Tool Inspectorなどでツールを確認してください。

Chrome Origin Trialを使う場合は、対象origin用のトークンを `.env.local` の `VITE_WEBMCP_ORIGIN_TRIAL_TOKEN` に設定します。この値はページへ公開されるため、秘密情報として扱う必要はありません。

## ディレクトリ構成

```text
packages/
└── content-pipeline/       MDXのビルド時変換と画像処理

src/
├── analytics/               GA4ビーコンと人気記事取得の境界
├── components/
│   ├── article/             記事本文の構成部品（MDXのcomponentsマップ、目次）
│   └── ui/                  React Ariaを使う操作部品
├── content/                 散文のみ
│   ├── posts/               Git管理するMDX記事とローカル画像
│   ├── media-manifest.json  画像の実寸と配信形式
│   └── .generated/          ビルド時に生成する一覧用サマリ
├── data/                    カテゴリ・タグなどのサイト分類データ
├── lib/
│   └── posts/               PostRepositoryとMDXソースの読み込み
├── routes/                  画面ルートと配信メタデータのサーバールート
├── server/                  RSS、サイトマップ、robotsなどのレスポンス生成
└── styles.css               Tailwind CSSのエントリーポイントとデザイントークン
```

`scripts/generate-post-summaries.ts` は公開記事のfrontmatterを検証し、一覧用のサマリを `src/content/.generated/` に生成します。本文と目次はMDXモジュール自身が持つため、ここでは書き出しません。変換系の依存関係は `packages/content-pipeline` に閉じているため、ルートアプリの本番依存関係には含まれません。`scripts/generate-ogp.tsx` は記事のタイトル・カテゴリ・タグをOGPカードに描画し、ローカルPNGまたはR2へ出力します。`scripts/upload-media.ts` はGit管理外の画像をR2へアップロードします。これらのディレクトリは生成物またはローカル作業用のためGit管理しません。`bun run build` のprerender処理で、記事・一覧・カテゴリ・タグ・RSSなどのHTML／テキストを `dist/client` に出力します。

`src/routeTree.gen.ts` はTanStack Routerが生成するファイルです。ルートファイルを追加したときは、必要に応じて次を実行します。

```sh
bun run generate-routes
```

## 今後の拡張方針

まずはGit管理のMDXを記事のsource of truthとして運用します。

- Headless CMSは、複数人編集・Web上の執筆・承認フローなどが必要になった段階でRepositoryアダプターとして追加する
- ElysiaなどのAPIフレームワークは、管理APIやWebhookなどの具体的な要件が出た段階で別Workerとして追加する
- 人気記事を Cloudflare Web Analytics の集計から作るか、定期生成した静的データとして配るか
- 検索、隠しゲーム、記事本文の表示をどの順番で復元するか
