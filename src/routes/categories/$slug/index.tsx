import { createFileRoute, notFound } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/lib/posts/repository";
import { categoryBySlug } from "#/data/navigation";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/categories/$slug/")({
  loader: async ({ params }) => {
    const category = categoryBySlug(params.slug);
    if (!category) throw notFound();
    return { posts: await postRepository.list({ category: category.slug }) };
  },
  head: ({ params }) => {
    const name = categoryBySlug(params.slug)?.name ?? "カテゴリ";

    return createPageHead({
      title: withSiteName(`カテゴリ: ${name}`),
      description: `「${name}」の記事一覧`,
      path: `/categories/${encodeURIComponent(params.slug)}`,
    });
  },
  component: CategoryIndexPage,
});

function CategoryIndexPage() {
  const { slug } = Route.useParams();
  const { posts } = Route.useLoaderData();
  return <CategoryPageContent slug={slug} page={1} posts={posts} />;
}
