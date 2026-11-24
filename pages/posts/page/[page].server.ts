import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import { createPageHead, withSiteName } from "#/lib/site";
import { paginate, parsePage } from "#/lib/pagination";
import { sharePage } from "../../../src/page-context";
import { extraPages, getPostFilters, postRepository } from "../../../src/posts";

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/posts/page/[page]">[]> {
  return extraPages((await postRepository.list()).length).map((page) => ({ page: String(page) }));
}

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const { page: raw } = c.req.param() as PageParams<"/posts/page/[page]">;
  const page = parsePage(String(raw));
  const [posts, filters] = await Promise.all([postRepository.list(), getPostFilters()]);
  const { slice, current, total } = paginate(posts, page ?? 0);
  if (page === null || page < 2 || page > total) throw new HTTPException(404);
  return { slice, current, total, totalPosts: posts.length, filters };
});

export const head = defineHead<Props>((_c, { current }) =>
  createPageHead({
    title: withSiteName(`記事一覧（${current}ページ目）`),
    description: `記事一覧（${current}ページ目）`,
    path: `/posts/page/${current}`,
  }),
);
