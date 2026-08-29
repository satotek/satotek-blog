---
title: WebMCP というものを試してみた
date: 2026-08-30
description: WebMCP がどんなものなのか確かめるため、satotek.dev で記事の検索・一覧・表示を AI エージェントから試してみた話。
cover: https://img.satotek.dev/webmcp-blog-tools/codex-webmcp-execution.png
category: tech
tags:
  - WebMCP
  - AI
  - Chrome
  - TypeScript
  - MCP
---

最近、WebMCP というものを知りました。Web サイトが AI エージェント向けにツールを公開できる仕組みだ、というところまでは分かったのですが、実際に組み込んだときの使い心地や、どのくらいの実装で動くのかは、触ってみないと分かりません。

そこで、このブログにツールを登録して、Chrome と Codex から呼び出してみました。目指したのは、エージェントにこう頼めるようにすることです。

> このブログで WebMCP について書いた記事を探して、最初の記事を開いて

画面を見て検索フォームを探し、文字を入力し、リンクをクリックする代わりに、ページが公開したツールを直接呼び出す。これが本当に動くのかを確かめます。

ブログを AI 対応サービスに仕立てるのが目的ではありません。どのくらいの実装で何ができるのか、DOM を直接操作する場合と何が変わるのかを知ることが目的です。

## WebMCP とは

[WebMCP](https://developer.chrome.com/docs/ai/webmcp?hl=ja) は、Web サイトが AI エージェント向けの構造化されたツールを公開するための、提案段階の Web 標準です。

普通のブラウザ操作では、エージェントはまず DOM を読みます。ボタンのラベルや入力欄の位置から「これは検索ボタンだろう」と推測して操作するので、画面が少し変わっただけで失敗することがあります。

WebMCP では、ページ側が「このページには `search_posts` というツールがあり、`query` という文字列を受け取る」と宣言できます。エージェントは見た目ではなく、ツール名・説明・JSON Schema を見て機能を呼び出します。

### 通常の MCP との違い

一番の違いは、ツールがどこにあるかです。

```text
通常の MCP
AI エージェント ── MCP ── 外部サーバー / API

WebMCP
AI エージェント ── ブラウザ ── Web ページが公開したツール
```

Chrome の [MCP と WebMCP の比較](https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja)にまとまっていますが、そこから派生する違いがいくつかあります。

|              | 通常の MCP                  | WebMCP                              |
| ------------ | --------------------------- | ----------------------------------- |
| 実行場所     | 任意のプラットフォーム      | ブラウザのみ                        |
| 定義方法     | JSON-RPC と各言語の SDK     | JavaScript または HTML 属性         |
| 寿命         | 常駐（サーバー / デーモン） | タブに紐づき一時的                  |
| コンテキスト | ヘッドレス・外部から        | DOM、Cookie、ログイン中のセッション |
| ツールの発見 | エージェント側の登録フロー  | ユーザーがページを開いた時点        |

このうち、実装していて意識させられたのは下の 2 つです。

**ツールはタブと一緒に消えます。** サーバーとして常駐する MCP と違い、WebMCP のツールはページが開いている間しか存在しません。ユーザーがタブを閉じたり別のサイトへ移動したりすれば、エージェントはもう何も呼び出せません。

これは今回の `open_post` で実際に起きます。実装は `window.location.assign()` によるフル遷移なので、記事を開いた瞬間に元のページはアンロードされ、ツールは一度破棄されます。遷移先で登録モジュールが再実行され、あらためて 3 つのツールが登録される。エージェントから見れば同じツールが並んでいるだけですが、実体は別のページのものです。

**認証を別に用意する必要がありません。** ツールはユーザーが開いているそのページで動くので、ログイン済みのセッションや Cookie をそのまま使えます。MCP サーバーのように API キーを発行して権限を設計する、という手順が要りません。

便利な反面、これは「エージェントがユーザーの権限で操作できる」ということでもあります。だからこそ、入力の検証をページ側できちんと行う必要があります（後述）。

そして、この 2 つは対立するものではありません。Chrome のドキュメントも両者を組み合わせる形を勧めています。バックグラウンドで完結する処理や、ブラウザを開いていなくても動いてほしい処理は MCP サーバーへ。画面を開いている文脈でこそ意味がある操作は WebMCP へ、という住み分けになります。

Web サイトをバックエンドの MCP サーバーに置き換えるものではなく、ページ自身が、そのページで今できることをブラウザへ公開する仕組みです。

### RSS や llms.txt との違い

WebMCP を入れたからといって、RSS や Markdown の配信が不要になるわけではありません。役割が違います。

| 仕組み                             | 役割                        |
| ---------------------------------- | --------------------------- |
| HTML / RSS / Markdown / `llms.txt` | AI がサイトの**情報を読む** |
| WebMCP                             | AI がサイトの**機能を使う** |

記事本文を要約したいだけなら、RSS や Markdown、`llms.txt` のほうが扱いやすい場面もあります。反対に「このサイトの中から条件に合う記事を探して開く」という操作は、ツールとして表現したほうが意図を伝えやすい。このサイトでは、コンテンツの配信とエージェント向けの操作を別の層として持たせるのがよさそうです。

なお、まだ実験的な API なので、通常のサイト機能を置き換えるのではなく、対応ブラウザやエージェントがあるときだけ機能が増える progressive enhancement として扱うのが現実的です。

## ブログで試す題材を決める

WebMCP の例としては、予約フォームやショッピングカートのような「人間が操作すると複数の手順が必要な機能」が分かりやすいと思います。個人ブログに同じ必然性はありません。記事を読むだけなら HTML でも RSS でも足ります。

それでも題材として選んだのは、ブログには「記事を探す」「条件で絞り込む」「見つけた記事を開く」という、ツールにしやすい操作が揃っているからです。検索結果から記事を開くところまで一つの会話でつながれば、感触をつかむには十分です。WebMCP の記事を WebMCP で試せるのも面白そうでした。

試す機能は、読み取り系を中心に 3 つへ絞りました。最初から本文の要約や推薦まで入れると、仕組みを試しているのかツールを作り込んでいるのか分からなくなるからです。

| ツール         | 引数                          | 何をするか                                     |
| -------------- | ----------------------------- | ---------------------------------------------- |
| `search_posts` | `query`, `limit?`             | 記事のタイトル・説明・カテゴリ・タグを検索する |
| `list_posts`   | `category?`, `tag?`, `limit?` | カテゴリやタグで絞り込んだ記事一覧を返す       |
| `open_post`    | `slug`                        | 現在のタブで記事を開く                         |

`search_posts` と `list_posts` は、記事本文全体ではなく、エージェントが次の判断に使いやすい短いメタデータだけを返します。

```json
{
  "slug": "nix-flakes-dotfiles",
  "title": "dotfiles を Nix Flakes で管理している話",
  "url": "http://localhost:3000/posts/nix-flakes-dotfiles",
  "date": "2026-07-04",
  "category": "技術",
  "tags": ["Nix", "Home Manager", "nix-darwin"]
}
```

`open_post` は、検索や一覧で返された slug を受け取って現在のタブで記事を開きます。任意の URL を受け取って遷移するのではなく、公開済み記事の一覧に slug が存在するか確認してから遷移します。

記事検索は、記事本文の Markdown を毎回解析しているわけではありません。このサイトではビルド時に Markdown から記事のサマリを生成していて、ツールはそのサマリをブラウザ上で検索します。

```text
Markdown
  ↓ ビルド時
記事サマリ（summaries.json）
  ↓
postRepository
  ↓
WebMCP tools
  ├─ search_posts
  ├─ list_posts
  └─ open_post
```

## 宣言的 API と命令的 API

WebMCP がツールを公開する方法は 2 つあります。

**宣言的 API（Declarative API）** は、既存の HTML フォームに属性を足すだけでツールにします。JavaScript は書きません。

```html
<form toolname="createSupportRequest" tooldescription="Submits a request for customer support.">
  <input name="subject" toolparamdescription="Subject of the request" />
</form>
```

`<form>` に `toolname` と `tooldescription`、各入力欄に `toolparamdescription` を付けると、フォームの構造から JSON Schema が組み立てられます。既定ではエージェントが値を埋めるところまでで、送信はユーザーが Submit を押します。自動で送信させたい場合は `toolautosubmit` を足します。

**命令的 API（Imperative API）** は、JavaScript から `document.modelContext.registerTool()` を呼んでツールを登録します。入力スキーマも実行内容も自分で書きます。

違いは「すでに画面にある操作を、そのままエージェントへ開放するか」「画面には無い操作を、エージェント向けに定義するか」です。

|                | 宣言的 API                           | 命令的 API                |
| -------------- | ------------------------------------ | ------------------------- |
| 書く場所       | HTML の属性                          | JavaScript                |
| スキーマ       | フォーム構造から自動生成             | 自分で JSON Schema を書く |
| 実行内容       | フォーム送信                         | 任意の処理                |
| 向いている対象 | 予約・問い合わせなど、既存のフォーム | フォームに紐づかない操作  |

宣言的 API の良いところは、人間が使うフォームとエージェントが使うツールが同じ実装になる点です。片方だけ直して食い違う、ということが起きません。

今回は命令的 API を使いました。このブログには検索フォームが無く、`search_posts` も `list_posts` も画面上の UI に対応していないためです。開放したい操作がフォームとして存在しない以上、宣言的 API では表現できません。

## 命令的 API でツールを登録する

最小構成はこういう形です。

```ts
await document.modelContext.registerTool({
  name: "search_posts",
  description: "Search published articles by keyword.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Keyword or phrase to search for.",
      },
    },
    required: ["query"],
  },
  execute: async ({ query }) => {
    return searchPosts(query);
  },
});
```

このサイトでは、ルートシェルから一度だけ登録モジュールを import しています。

```tsx title="src/routes/__root.tsx"
import "#/webmcp/register";
```

登録処理では、WebMCP に対応していないブラウザでも通常どおり表示できるように、`document.modelContext` の存在を確認します。

```ts title="src/webmcp/register.ts"
function currentModelContext() {
  if (typeof document === "undefined") return undefined;

  try {
    return document.modelContext;
  } catch {
    return undefined;
  }
}

export function registerBlogWebMcpTools() {
  const modelContext = currentModelContext();
  if (!modelContext) return undefined;

  // search_posts / list_posts / open_post を登録する
  // ...
}
```

### 型は webmcp-types から借りる

WebMCP は TypeScript の標準 DOM 型にまだ含まれていません。手元の TypeScript 7.0.2 の `lib` を検索しても `modelContext` は 1 件も出てきませんでした。

型は、仕様を出している W3C Web Machine Learning CG が公開している [`webmcp-types`](https://www.npmjs.com/package/webmcp-types) を使っています。

```sh
bun add -d webmcp-types
```

このパッケージは `WebMCP` 名前空間と `Document.modelContext` をグローバルに宣言します。import するものが無いので、`tsconfig.json` の `types` に足して読み込ませます。

```json
"types": ["vite-plus/client", "node", "webmcp-types"]
```

これだけで `document.modelContext` に型が付き、ツールの型もグローバルの名前空間からそのまま書けます。

```ts
export function createBlogWebMcpTools(): readonly WebMCP.ModelContextTool[] {
```

型を読んでいて気づいたのは、`execute` の第 2 引数が必須だということです。

```ts
type ToolExecuteCallback<T extends Record<string, unknown> = Record<string, unknown>> = (
  inputObject: T,
  options: ToolExecuteCallbackOptions,
) => MaybePromise<unknown>;
```

`ToolExecuteCallbackOptions` が持つのは `signal: AbortSignal` です。エージェントが実行を打ち切ったことをツールへ伝えるためのもので、時間のかかる処理を書くなら見る必要があります。今回の 3 つはどれも即座に返るので使っていませんが、テストでは実際のブラウザと同じ形で呼ぶようにしました。

```ts
const executeOptions = { signal: new AbortController().signal };

const searchResult = await search.execute({ query: "Nix" }, executeOptions);
```

## 読み取り専用とページ遷移を分ける

3 つのツールを同じものとして扱わないことも意識しました。

```ts
annotations: {
  readOnlyHint: true,
  untrustedContentHint: true,
}
```

`search_posts` と `list_posts` は記事データを読むだけなので `readOnlyHint: true`。`open_post` は現在のタブを変更するため、読み取り専用ではありません。

この区別は飾りではありません。エージェントやクライアントが、確認なしで実行してよい処理か、ユーザーに確認すべき処理かを判断する材料になります。今回は記事を開くだけなので影響は小さいですが、「記事を削除する」「下書きを公開する」といったツールを足すなら、確認を挟む設計が必要になります。

## Chrome で試す

ローカル開発では、Chrome のフラグを有効にします。

1. `chrome://flags/#enable-webmcp-testing` を開く
2. WebMCP testing を Enabled にする

   ![Chrome の chrome://flags で WebMCP for testing を Enabled にした状態](https://img.satotek.dev/webmcp-blog-tools/chrome-webmcp-testing-flag.png "WebMCP for testing の設定"){width=768 .center}

3. Chrome を再起動する
4. `http://localhost:3000` を開く

Chrome DevTools の Application パネルには WebMCP ペインがあり、ページが公開しているツール名、説明、入力スキーマ、呼び出し履歴を確認できます。

![Chrome DevTools の Application > WebMCP パネルに表示されたブログのツール一覧](https://img.satotek.dev/webmcp-blog-tools/devtools-webmcp.png "Chrome DevTools の WebMCP パネル"){width=1200 .center}

今回のローカル環境では、次の 3 つが表示されました。

- `list_posts`
- `open_post`
- `search_posts`

ただし DevTools のパネルは「ページがどんなツールを公開しているか」を確認する場所です。エージェントから使うには、WebMCP に対応したクライアントをブラウザへ接続します。

## MCP クライアントから呼び出す

Chrome DevTools MCP を使って、起動中の Chrome に接続しました。これは、ページの WebMCP ツールを MCP クライアントへ橋渡しする MCP サーバーです。

`--category-experimental-webmcp` が WebMCP 用ツールを有効にするオプションです。`--auto-connect` を使う場合は、Chrome の `chrome://inspect/#remote-debugging` からリモートデバッグを許可しておきます。

![Chrome DevTools の Remote debugging 設定画面。リモートデバッグを許可し、127.0.0.1:9222 でサーバーが起動している状態](https://img.satotek.dev/webmcp-blog-tools/remote-debugging.png "Chrome DevTools の Remote debugging 設定"){width=1200 .center}

Codex から使えるようにするには、次のコマンドを実行します。

```sh
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest --auto-connect --category-experimental-webmcp
```

そのうえで Chrome を WebMCP のフラグを有効にした状態で起動し、MCP クライアントを再起動します。あとは Codex に頼むだけです。

```text
今開いている Chrome の localhost:3000 で、
Nix の記事を検索して、検索結果の最初の記事を開いて
chrome-devtoolsを使って
```

実際に試すと、まず次の呼び出しが行われました。

```json
{
  "toolName": "search_posts",
  "input": {
    "query": "Nix",
    "limit": 3
  }
}
```

検索結果から `nix-flakes-dotfiles` が返り、その slug を使って次の呼び出しが行われます。

```json
{
  "toolName": "open_post",
  "input": {
    "slug": "nix-flakes-dotfiles"
  }
}
```

最後に、Chrome の現在のタブが `http://localhost:3000/posts/nix-flakes-dotfiles` に遷移しました。

![Codex から WebMCP ツールを呼び出し、検索結果の記事を Chrome で開いた実行例](https://img.satotek.dev/webmcp-blog-tools/codex-webmcp-execution.png "Codex から WebMCP ツールを呼び出した実行例"){width=1200 .center}

`Application > WebMCP` パネルでは呼び出し履歴も確認できます。実行結果に加えて、エージェントが渡した入力値とツールが返した出力が一覧で見られます。

![Chrome DevTools の WebMCP パネルに表示された search_posts と open_post の実行履歴](https://img.satotek.dev/webmcp-blog-tools/devtools-webmcp-invocation-history.png "WebMCP ツールの実行履歴"){width=1200 .center}

ここまで動くと、WebMCP が「AI に読ませるためのページ情報」ではなく「ページ自身が提供する操作のインターフェース」だということが実感できます。

## 試して分かったこと

想像していたことと、動かして分かったことには少し差がありました。

### ツールの数は少ないほうがよい

本文取得、関連記事推薦、タグ追加、アクセス解析と、いくらでもツールにできます。しかし増えるほど、エージェントはどれを使うべきか迷います。

今回は検索・一覧・遷移の 3 つだけにしました。記事を探して開くという流れが成立するので、呼び出しを試すにはこれで十分です。機能を作り込むより、登録・発見・実行・遷移を一通り通すことを優先しました。

### 戻り値は短く、次の判断に必要な形にする

`search_posts` が記事本文まで返すと、レスポンスが大きくなります。検索結果に必要なのは、タイトル、URL、説明、タグ、slug くらいです。

「何を返せばエージェントが次の一手を選べるか」を考えると、ツールの設計は自然に小さくなります。

### ページ側の検証が重要

WebMCP のツールを実行するのは、ブラウザ上のページです。入力値をエージェントが生成する以上、ツール側で検証しなければなりません。

今回も、空の検索語を拒否し、`limit` を 1〜10 に制限し、`open_post` では公開済み記事に存在する slug だけを受け付けています。エージェントの指示を信頼するのではなく、通常の公開 API と同じように扱う必要があります。

## 次に試すなら

候補は記事本文を返す `get_post` です。ただし本文をそのまま返すのではなく、Markdown、見出し一覧、指定した見出しの内容、と分けたほうが扱いやすそうです。ほかにも次のようなツールは相性がよさそうでした。

- タグやカテゴリの一覧を取得する
- 現在の記事に関連する記事を探す
- 記事の特定の見出しだけを返す
- 読んだ記事をもとに次に読む記事を提案する

一方、コメント投稿や記事の編集のように外部状態を変更する機能は、認証と確認フローを先に考えるべきでしょう。便利そうだからといって何でも AI から操作できるようにするのは危険です。

触ってみた率直な感想としては、ブログのように読むことが中心のサイトで WebMCP がなければ困る場面は、まだ多くありません。それでも、ページ側がツール名と入力スキーマを明示できることで、DOM を読んで推測させるのとは違うインターフェースが作れるのは確かでした。`search_posts` の結果から `open_post` へ、一つの指示でつながったときが一番おもしろかったところです。

現時点ではまだ実験的で、ブラウザやクライアントによって使える機能も違います。本番機能の前提にするには早いものの、実装の規模感を知る題材としてはかなり良かったと思います。気が向いたら記事本文の一部取得や、ページ内の状態を扱うツールを試してみます。

## 付録: MCP API から呼び出す

ここまでの例では Codex に自然言語で指示していましたが、実際には Chrome DevTools MCP が提供する MCP ツールを経由して、ブラウザ上の WebMCP ツールが呼ばれています。

MCP クライアントから見ると、まず `list_webmcp_tools` で対象ページが公開しているツールを取得します。

```json
{
  "name": "list_webmcp_tools",
  "arguments": {
    "pageId": 13
  }
}
```

すると、ページ上の `search_posts`、`list_posts`、`open_post` と、それぞれの説明・入力スキーマが返ります。

次に `execute_webmcp_tool` へ、WebMCP ツール名と入力を渡します。`input` は JSON オブジェクトそのものではなく、JSON 文字列として渡す点に注意が必要です。

```json
{
  "name": "execute_webmcp_tool",
  "arguments": {
    "pageId": 13,
    "toolName": "search_posts",
    "input": "{\"query\":\"Nix\",\"limit\":3}"
  }
}
```

戻り値は、WebMCP 側の `execute` が返した構造化データです。

```json
{
  "status": "Completed",
  "output": {
    "query": "Nix",
    "total": 1,
    "returned": 1,
    "hasMore": false,
    "posts": [
      {
        "slug": "nix-flakes-dotfiles",
        "title": "dotfiles を Nix Flakes で管理している話"
      }
    ]
  }
}
```

検索結果の slug を使えば、同じ仕組みでページ遷移も呼び出せます。

```json
{
  "name": "execute_webmcp_tool",
  "arguments": {
    "pageId": 13,
    "toolName": "open_post",
    "input": "{\"slug\":\"nix-flakes-dotfiles\"}"
  }
}
```

ややこしいのは、`search_posts` や `open_post` が MCP サーバーのツールとして存在しているわけではないことです。MCP サーバーである Chrome DevTools MCP が、ページの WebMCP ツールを発見・実行するための窓口を提供しています。

```text
MCP クライアント
  ↓ list_webmcp_tools / execute_webmcp_tool
Chrome DevTools MCP
  ↓ ブラウザ経由
satotek.dev の WebMCP
  ├─ search_posts
  ├─ list_posts
  └─ open_post
```

実際のクライアントでは、この JSON を手書きする代わりに Codex や Claude Code がツールスキーマを見て呼び出します。API の形を直接確認したいときは、[Chrome DevTools MCP のツールリファレンス](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)が参考になります。

参考:

- [WebMCP | Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp?hl=ja)
- [MCP と WebMCP の比較 | Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/compare-mcp?hl=ja)
- [Imperative API | Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Declarative API | Chrome for Developers](https://developer.chrome.com/docs/ai/webmcp/declarative-api)
- [Debug WebMCP tools | Chrome DevTools](https://developer.chrome.com/docs/devtools/application/webmcp)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
