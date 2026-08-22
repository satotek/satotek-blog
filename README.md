# satotek.dev PoC

現行の `satotek.dev` を、Vite+ と TanStack Start で作り直すための最小PoCです。

現時点では、既存サイトのコンテンツと雰囲気を参考にした表示・ルーティングPoCです。

- トップページとプロフィールページ
- TanStack Router のファイルベースルーティング
- `/posts/$slug` の動的ルート
- カテゴリ／タグ一覧と記事一覧、`/page/N` のページ送り
- `robots.txt`、サイトマップ、RSS、`llms.txt`、`security.txt`
- 現行サイトの公開記事を参考にしたPoC用の静的データ
- レスポンシブ対応、キーボードフォーカス、OSのダークモード対応

Markdownの解析、CMS、OG画像、記事ごとの追加機能は、ルート構成とコンテンツ移行方針が決まってから追加します。

## 技術スタック

- Vite+ 0.2 — `vp build` / `vp check`（開発サーバーはCloudflare公式構成に合わせて `vite dev`）
- TanStack Start — SSRとルーティングのアプリケーション基盤
- TanStack Router — ファイルベースルーティング
- React 19 / TypeScript 7.0
- Bun 1.3 — パッケージ管理とスクリプト実行
- Tailwind CSS 4 — ViteプラグインでユーティリティCSSを生成
- lucide-react — RSS、メニュー、テーマ切替などのUIアイコン

## 開発

```sh
bun install
bun run dev
```

開発サーバーは `http://localhost:3000` で起動します。

## 検証

```sh
bun run typecheck
bun run check
bun run build
bun run preview
```

`bun run check` は `src/` のVite+フォーマット・Lintに加えてTypeScriptの型検査も実行します。フォント定義などの静的アセットはベンダー生成物として検査対象から外しています。`bun run dev` はCloudflare Vite Pluginとの開発時互換性を優先し、`vite dev`を直接起動します。

## ディレクトリ構成

```text
src/
├── components/              記事カード、カテゴリ／タグ一覧
├── data/                    PoC用の記事・カテゴリ・タグデータ
├── lib/                     ページ送り、サイトURLなどの共通処理
├── routes/                  画面ルートと配信メタデータのサーバールート
├── server/                  RSS、サイトマップ、robotsなどのレスポンス生成
└── styles.css               Tailwind CSSのエントリーポイントとデザイントークン
```

`src/routeTree.gen.ts` はTanStack Routerが生成するファイルです。ルートファイルを追加したときは、必要に応じて次を実行します。

```sh
bun run generate-routes
```

## 次に決めたいこと

PoCの次の段階では、以下を決めてから既存コンテンツを段階的に移行します。

- Markdownをビルド時に読むか、TanStack Startのサーバー処理で読むか
- CMSを継続利用するか、GitベースのMarkdown運用に戻すか
- 検索、隠しゲーム、OG画像、記事本文のMarkdown表示をどの順番で復元するか
