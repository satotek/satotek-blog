import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/lib/posts/repository";
import { categoryBySlug } from "#/data/navigation";
import { createPageHead, withSiteName } from "#/lib/site";
import { parsePage, POSTS_PER_PAGE } from "#/lib/pagination";

export const Route = createFileRoute("/categories/$slug/page/$page")({
  loader: async ({ params }) => {
    const category = categoryBySlug(params.slug);
    const page = parsePage(params.page);
    const posts = category ? await postRepository.list({ category: category.slug }) : [];
    const itemCount = posts.length;
    const total = Math.max(1, Math.ceil(itemCount / POSTS_PER_PAGE));

    if (!category || page === null || page > total) throw notFound();
    if (page === 1) {
      throw redirect({
        to: "/categories/$slug",
        params: { slug: params.slug },
        statusCode: 301,
        throw: true,
      });
    }
    return { posts };
  },
  head: ({ params }) => {
    const name = categoryBySlug(params.slug)?.name ?? "カテゴリ";

    return createPageHead({
      title: withSiteName(`カテゴリ: ${name}（${params.page}ページ目）`),
      description: `「${name}」の記事一覧（${params.page}ページ目）`,
      path: `/categories/${encodeURIComponent(params.slug)}/page/${params.page}`,
    });
  },
  component: CategoryNumberedPage,
});

function CategoryNumberedPage() {
  const { slug, page: rawPage } = Route.useParams();
  const { posts } = Route.useLoaderData();
  const page = parsePage(rawPage);

  return page === null ? null : <CategoryPageContent slug={slug} page={page} posts={posts} />;
}
