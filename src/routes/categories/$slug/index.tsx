import { createFileRoute, notFound } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/content/repository";
import { categoryBySlug } from "#/data/navigation";
import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/categories/$slug/")({
  loader: async ({ params }) => {
    const category = categoryBySlug(params.slug);
    if (!category) throw notFound();
    return { posts: await postRepository.list({ category: category.slug }) };
  },
  head: ({ params }) => {
    const category = categoryBySlug(params.slug);
    const name = category?.name ?? "カテゴリ";

    return {
      meta: [
        { title: `カテゴリ: ${name} | satotek.dev` },
        { name: "description", content: `「${name}」の記事一覧` },
        ...createSocialMeta({
          title: `カテゴリ: ${name} | satotek.dev`,
          description: `「${name}」の記事一覧`,
          url: `${SITE_URL}/categories/${params.slug}`,
        }),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/categories/${params.slug}` }],
    };
  },
  component: CategoryIndexPage,
});

function CategoryIndexPage() {
  const { slug } = Route.useParams();
  const { posts } = Route.useLoaderData();
  return <CategoryPageContent slug={slug} page={1} posts={posts} />;
}
