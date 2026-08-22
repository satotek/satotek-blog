export type Post = {
  slug: string;
  title: string;
  date: string;
  category: import("#/data/navigation").CategorySlug;
  description: string;
  tags: readonly string[];
  paragraphs: readonly string[];
  cover?: string;
};

// PoCでは、現行サイトの公開記事から最小限の表示データだけを持つ。
// Markdownの解析と記事ファイルの移行は、ルーティングが固まってから追加する。
export const posts: readonly Post[] = [
  {
    slug: "nepal-trip",
    title: "去年、ネパールに行った話",
    date: "2026-07-04",
    category: "travel",
    description:
      "香港で18時間の缶詰、壊れかけのアトラクションみたいなバス、見えないヒマラヤ。それでも一番覚えているのは、高校時代の友人4人がなぜかネパールに集まったことでした。",
    tags: ["ネパール", "旅行"],
    paragraphs: [
      "去年、ネパールへ行ってきました。到着前から予定どおりにはいかない旅でしたが、振り返るとその寄り道まで含めて印象に残っています。",
      "高校時代の友人4人がなぜかネパールに集まった、という出来事を写真と一緒に記録しています。",
    ],
  },
  {
    slug: "nix-flakes-dotfiles",
    title: "dotfiles を Nix Flakes で管理している話",
    date: "2026-07-04",
    category: "tech",
    description:
      "macOS・Linux・WSL・Azure VM の環境を Nix Flakes + Home Manager に寄せた話。設定の書き分け、シェル起動の高速化、AI エージェント設定の宣言管理、flake.lock の自動更新まで。",
    tags: ["Nix", "Home Manager", "dotfiles"],
    paragraphs: [
      "私の dotfiles は Nix Flakes で管理しています。マシンが増えるほど、ツールのインストール方法や設定ファイルの差分を手作業で揃えるのが難しくなったためです。",
      "Nix + Home Manager に寄せることで、パッケージ・設定・シェル環境を宣言的に扱えるようになりました。",
    ],
  },
  {
    slug: "cloudflare-workers-site",
    title: "Cloudflare Workers でサイトを作ってみた",
    date: "2026-06-07",
    category: "tech",
    description:
      "普段は Azure を触っている人間が、個人サイトを Cloudflare Workers で立ててみた話。",
    tags: ["Cloudflare", "Workers", "Hono"],
    cover: "https://img.satotek.dev/cloudflare-workers-site/architecture.svg",
    paragraphs: [
      "このサイトは Cloudflare Workers でホストしています。普段は仕事で Azure を触ることが多いので、個人サイトでは別の環境を試してみることにしました。",
      "個人サイトや小さなツールを置く場所として、Cloudflare Workers は思っていたより手軽でした。今回のPoCでは、この実績を次の構成へ引き継ぐ準備をしています。",
    ],
  },
  {
    slug: "first-post",
    title: "はじめまして",
    date: "2026-06-07",
    category: "daily",
    description: "自己紹介と、このサイトを作った経緯について。",
    tags: ["雑記"],
    cover: "https://img.satotek.dev/first-post/DSC_7242.webp",
    paragraphs: [
      "はじめまして。nosuke と申します。旅行、技術、ガジェット、読書記録などの記事を気ままに書いています。",
      "表示はできるだけ速く、書くのは気楽に。そんな方針で、少しずつサイトに手を入れていこうと思っています。",
    ],
  },
];

export function findPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function formatDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}
