import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import { createPageHead, withSiteName } from "#/lib/site";
import { getTags } from "#/data/navigation";
import { parsePage } from "#/lib/pagination";
import { sharePage } from "../../../../src/page-context";
import { decodeParam } from "../../../../src/params";
import { extraPages, getPostFilters, postRepository } from "../../../../src/posts";

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/tags/[tag]/page/[page]">[]> {
  return (await getTags()).flatMap(({ name, count }) =>
    extraPages(count).map((page) => ({ tag: name, page: String(page) })),
  );
}

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const { tag: rawTag, page: rawPage } = c.req.param() as PageParams<"/tags/[tag]/page/[page]">;
  const tag = decodeParam(rawTag);
  const page = parsePage(String(rawPage));
  const posts = await postRepository.list({ tag });
  if (posts.length === 0 || page === null || page < 2) {
    c.set("headDefaults", { title: withSiteName("ページが見つかりません") });
    throw new HTTPException(404);
  }
  return { tag, page, posts, filters: await getPostFilters() };
});

export const head = defineHead<Props>((_c, { tag, page }) =>
  createPageHead({
    title: withSiteName(`タグ: ${tag}（${page}ページ目）`),
    description: `「${tag}」の記事一覧（${page}ページ目）`,
    path: `/tags/${encodeURIComponent(tag)}/page/${page}`,
  }),
);
