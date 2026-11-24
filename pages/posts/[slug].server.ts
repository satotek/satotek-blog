import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import type { TocItem } from "#/core/posts/types";
import { createPageHead, generatedPostOgImageUrl, withSiteName } from "#/lib/site";
import { listPostSummaries } from "#/lib/posts/post-summaries";
import { sharePage } from "../../src/page-context";
import { relatedPosts } from "../../src/posts";

type ArticleMetaModule = {
  toc: readonly TocItem[];
};

const articleMeta = import.meta.glob<ArticleMetaModule>("../../src/content/posts/*/index.mdx", {
  eager: true,
});

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/posts/[slug]">[]> {
  return listPostSummaries().map(({ slug }) => ({ slug }));
}

export const loader = defineHandler((c) => {
  sharePage(c);
  const { slug } = c.req.param() as PageParams<"/posts/[slug]">;
  const posts = listPostSummaries();
  const post = posts.find((summary) => summary.slug === slug);
  if (!post) {
    c.set("headDefaults", { title: withSiteName("ページが見つかりません") });
    throw new HTTPException(404);
  }
  const toc = articleMeta[`../../src/content/posts/${post.slug}/index.mdx`]?.toc ?? [];
  return { post, relatedPosts: relatedPosts(post, posts), toc };
});

export const head = defineHead<Props>((_c, { post }) => {
  const generatedImage = generatedPostOgImageUrl(post.slug);
  return createPageHead({
    title: withSiteName(post.title),
    // OGP はサイト名の接尾辞なしで記事タイトルだけを見せる。
    socialTitle: post.title,
    description: post.description,
    path: `/posts/${encodeURIComponent(post.slug)}`,
    image: generatedImage ?? post.cover,
    imageAlt: generatedImage
      ? `${post.title} のOGP画像`
      : post.cover
        ? `${post.title} のカバー画像`
        : undefined,
    type: "article",
    publishedTime: post.date,
  });
});
