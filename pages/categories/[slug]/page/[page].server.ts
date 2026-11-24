import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import type { PageParams } from "void/routes";

import { createPageHead, withSiteName } from "#/lib/site";
import { categoryBySlug, categories } from "#/data/navigation";
import { parsePage } from "#/lib/pagination";
import { sharePage } from "../../../../src/page-context";
import { extraPages, getPostFilters, postRepository } from "../../../../src/posts";

export type Props = InferProps<typeof loader>;

export async function getPrerenderPaths(): Promise<PageParams<"/categories/[slug]/page/[page]">[]> {
  const paths = await Promise.all(
    categories.map(async ({ slug }) =>
      extraPages((await postRepository.list({ category: slug })).length).map((page) => ({
        slug,
        page: String(page),
      })),
    ),
  );
  return paths.flat();
}

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const { slug, page: raw } = c.req.param() as PageParams<"/categories/[slug]/page/[page]">;
  const category = categoryBySlug(slug);
  const page = parsePage(String(raw));
  if (!category || page === null || page < 2) throw new HTTPException(404);
  const [posts, filters] = await Promise.all([
    postRepository.list({ category: category.slug }),
    getPostFilters(),
  ]);
  return { slug: category.slug, name: category.name, page, posts, filters };
});

export const head = defineHead<Props>((_c, { slug, name, page }) =>
  createPageHead({
    title: withSiteName(`カテゴリ: ${name}（${page}ページ目）`),
    description: `「${name}」の記事一覧（${page}ページ目）`,
    path: `/categories/${encodeURIComponent(slug)}/page/${page}`,
  }),
);
