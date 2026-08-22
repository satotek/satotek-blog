# satotek-blog

[satotek.dev](https://satotek.dev) のWebアプリケーションです。Vite+ と TanStack Start を使い、Cloudflare Workersへデプロイします。

本番の `satotek.dev` をこのリポジトリから直接デプロイできる構成にしています。

- トップページとプロフィールページ
- TanStack Router のファイルベースルーティング
- `/posts/$slug` の記事ルート
- カテゴリ／タグ一覧と記事一覧、`/page/N` のページ送り
- `robots.txt`、サイトマップ、RSS、`llms.txt`、`security.txt`
- `content/posts/<slug>/index.md` のfrontmatter付きMarkdown記事
- 記事タイトル・カテゴリ・タグから生成する1200×630のOGP画像
- レスポンシブ対応、キーボードフォーカス、OSのダークモード対応

記事データは `PostRepository` の境界越しに取得しています。現在はGit管理のMarkdownをViteのglob importで取り込み、frontmatterを検証してremark/rehypeとShikiでビルド時にHTMLと目次へ変換しています。公開済みの画面とテキスト配信物は静的アセットとして配信し、将来のCMSプレビューやAPI用にTanStack StartのWorker SSRも残しています。CMSを導入する場合も、画面ルートから取得元を切り離したままアダプターを追加できます。

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

ホームページの人気記事は `AnalyticsRepository` 経由です。いまの実装は空配列を返すローカルスタブで、集計スナップショットへ差し替えられるようにしてあります。

### 記事・サイト画像（R2）

記事画像とサイト内のコンテンツ画像はGitに置かず、Cloudflare R2の `satotek-media` バケットから配信します。公開用カスタムドメインは `https://img.satotek.dev` です。faviconやPWA用アイコンなど、アプリの静的アセットだけは `public/` に残します。

ローカルで作業中の画像は `.r2-media/` または `content/posts/<slug>/assets/` に置けます。どちらもGit管理対象外です。WranglerでCloudflareにログインした状態で、次のコマンドでアップロードします。

```sh
# 1枚アップロード。keyはR2上の公開パス
bun run upload-media -- \
  --file content/posts/first-post/assets/photo.webp \
  --key first-post/photo.webp

# .r2-media/ 以下を相対パスのまままとめてアップロード
bun run upload-media -- --directory .r2-media
```

アップロード後、Markdownでは出力された `https://img.satotek.dev/...` のURLを使います。

```md
![写真](https://img.satotek.dev/first-post/photo.webp)
```

`bun run deploy` はWorkerのデプロイだけを行い、画像を自動アップロードしません。画像を追加・差し替えたときは先に `bun run upload-media` を実行します。`upload-media` はS3 APIキーを直接扱わず、WranglerのCloudflare OAuth（CIでは `CLOUDFLARE_API_TOKEN`）を利用します。バケットを変更する場合は `R2_BUCKET_NAME` で上書きできます。

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

記事Markdownが`main`へマージされると、`.github/workflows/generate-ogp.yaml` が変更された記事だけを生成してR2へアップロードします。GitHubリポジトリには次のActions Secretsを登録してください。

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

`bun run deploy` は、MarkdownのHTML生成、Vite+のチェック、Cloudflare向けビルド、`wrangler deploy` を順に実行します。実行前にローカルで表示と主要ルートを確認してください。

`.env.local`、`.env.*`、`.dev.vars*` はGit管理対象外です。APIキー、秘密鍵、サービスアカウント認証情報などをリポジトリへ追加しないでください。GA4の測定IDは `.env.local` の `VITE_GA_MEASUREMENT_ID` で渡します。

旧サイトで使っていたリアクション・PV用のD1は、新アプリケーションからは参照していません。このリポジトリのデプロイ処理にD1データベースを削除する操作は含まれていません。

## 検証

```sh
bun run typecheck
bun run check
bun run build
bun run preview
```

`bun run check` はMarkdownのHTML生成、`src/` と `scripts/` のVite+フォーマット・Lint、TypeScriptの型検査を実行します。フォント定義などの静的アセットはベンダー生成物として検査対象から外しています。`bun run dev` も起動時にMarkdownのHTMLを生成してから開発サーバーを起動します。OGP画像の生成は `bun run generate-ogp:all` で個別に実行します。

## ディレクトリ構成

```text
content/
├── posts/                  Git管理するMarkdown記事
└── .generated/             ビルド時に生成するHTMLと目次

src/
├── analytics/               GA4ビーコンと人気記事取得の境界
├── components/              React Ariaを使う操作部品、記事カード、一覧
├── content/                 Markdown変換処理、PostRepository
├── data/                    カテゴリ・タグなどのサイト分類データ
├── lib/                     ページ送り、サイトURLなどの共通処理
├── routes/                  画面ルートと配信メタデータのサーバールート
├── server/                  RSS、サイトマップ、robotsなどのレスポンス生成
└── styles.css               Tailwind CSSのエントリーポイントとデザイントークン
```

`scripts/generate-post-content.ts` は公開MarkdownをShikiで変換し、`content/.generated/` にビルド用のHTMLと目次を生成します。`scripts/generate-ogp.tsx` は記事のタイトル・カテゴリ・タグをOGPカードに描画し、ローカルPNGまたはR2へ出力します。`scripts/upload-media.ts` はGit管理外の画像をR2へアップロードします。これらのディレクトリは生成物またはローカル作業用のためGit管理しません。`bun run build` のprerender処理で、記事・一覧・カテゴリ・タグ・RSSなどのHTML／テキストを `dist/client` に出力します。

`src/routeTree.gen.ts` はTanStack Routerが生成するファイルです。ルートファイルを追加したときは、必要に応じて次を実行します。

```sh
bun run generate-routes
```

## 今後の拡張方針

まずはGit管理Markdownを記事のsource of truthとして運用します。

- Headless CMSは、複数人編集・Web上の執筆・承認フローなどが必要になった段階でRepositoryアダプターとして追加する
- ElysiaなどのAPIフレームワークは、管理APIやWebhookなどの具体的な要件が出た段階で別Workerとして追加する
- 人気記事を Cloudflare Web Analytics の集計から作るか、定期生成した静的データとして配るか
- 検索、隠しゲーム、記事本文のMarkdown表示をどの順番で復元するか
