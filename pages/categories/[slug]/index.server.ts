import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import { createPageHead, withSiteName } from "#/lib/site";
import { categoryBySlug, categories } from "#/data/navigation";
import { sharePage } from "../../../src/page-context";
import { getPostFilters, postRepository } from "../../../src/posts";

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/categories/[slug]">[]> {
  const counts = await Promise.all(
    categories.map(async ({ slug }) => ({
      slug,
      count: (await postRepository.list({ category: slug })).length,
    })),
  );
  return counts.filter(({ count }) => count > 0).map(({ slug }) => ({ slug }));
}

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const { slug } = c.req.param() as PageParams<"/categories/[slug]">;
  const category = categoryBySlug(slug);
  if (!category) {
    c.set("headDefaults", { title: withSiteName("ページが見つかりません") });
    throw new HTTPException(404);
  }
  const [posts, filters] = await Promise.all([
    postRepository.list({ category: category.slug }),
    getPostFilters(),
  ]);
  return { slug: category.slug, name: category.name, posts, filters };
});

export const head = defineHead<Props>((_c, { slug, name }) =>
  createPageHead({
    title: withSiteName(`カテゴリ: ${name}`),
    description: `「${name}」の記事一覧`,
    path: `/categories/${encodeURIComponent(slug)}`,
  }),
);
