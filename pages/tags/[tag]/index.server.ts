import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import { createPageHead, withSiteName } from "#/lib/site";
import { getTags } from "#/data/navigation";
import { sharePage } from "../../../src/page-context";
import { getPostFilters, postRepository } from "../../../src/posts";
import { decodeParam } from "../../../src/params";

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/tags/[tag]">[]> {
  return (await getTags()).map(({ name }) => ({ tag: name }));
}

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const { tag: raw } = c.req.param() as PageParams<"/tags/[tag]">;
  const tag = decodeParam(raw);
  const posts = await postRepository.list({ tag });
  if (posts.length === 0) throw new HTTPException(404);
  return { tag, posts, filters: await getPostFilters() };
});

export const head = defineHead<Props>((_c, { tag }) =>
  createPageHead({
    title: withSiteName(`タグ: ${tag}`),
    description: `「${tag}」の記事一覧`,
    path: `/tags/${encodeURIComponent(tag)}`,
  }),
);
