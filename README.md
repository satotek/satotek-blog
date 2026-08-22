# satotek.dev PoC

現行の `satotek.dev` を、Vite+ と TanStack Start で作り直すための最小PoCです。

現時点では、既存サイトのコンテンツと雰囲気を参考にした表示・ルーティングPoCです。

- トップページとプロフィールページ
- TanStack Router のファイルベースルーティング
- `/posts/$slug` の動的ルート
- カテゴリ／タグ一覧と記事一覧、`/page/N` のページ送り
- `robots.txt`、サイトマップ、RSS、`llms.txt`、`security.txt`
- `src/content/posts/<slug>/index.md` のfrontmatter付きMarkdown記事
- レスポンシブ対応、キーボードフォーカス、OSのダークモード対応

記事データは `PostRepository` の境界越しに取得しています。現在はGit管理のMarkdownをViteのglob importで取り込み、frontmatterを検証してremark/rehypeでHTMLと目次へ変換しています。CMSを導入する場合も、画面ルートから取得元を切り離したままアダプターを追加できます。

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

### Analytics（任意）

Google Analytics 4のブラウザ計測は、公開して問題ない測定IDを設定した環境だけで有効になります。

```sh
cp .env.example .env.local
# .env.local
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

未設定のままでも動作し、ローカル開発やプレビューでは計測スクリプトを読み込みません。人気記事の取得は別の `AnalyticsRepository` に分けてあり、認証情報が必要なGA4 Data APIの接続は次段階で追加できます。

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
├── analytics/               GA4計測と人気記事取得の境界
├── components/              React Ariaを使う操作部品、記事カード、一覧
├── content/                 Markdown記事、変換処理、PostRepository
├── data/                    カテゴリ・タグなどのサイト分類データ
├── lib/                     ページ送り、サイトURLなどの共通処理
├── routes/                  画面ルートと配信メタデータのサーバールート
├── server/                  RSS、サイトマップ、robotsなどのレスポンス生成
└── styles.css               Tailwind CSSのエントリーポイントとデザイントークン
```

`src/routeTree.gen.ts` はTanStack Routerが生成するファイルです。ルートファイルを追加したときは、必要に応じて次を実行します。

```sh
bun run generate-routes
```

## 今後の拡張方針

まずはGit管理Markdownを記事のsource of truthとして運用します。

- Headless CMSは、複数人編集・Web上の執筆・承認フローなどが必要になった段階でRepositoryアダプターとして追加する
- ElysiaなどのAPIフレームワークは、管理APIやWebhookなどの具体的な要件が出た段階で別Workerとして追加する
- GA4 Data APIをWorkerから直接呼ぶか、集計結果を定期生成して静的データとして配るか
- 検索、隠しゲーム、OG画像、記事本文のMarkdown表示をどの順番で復元するか
