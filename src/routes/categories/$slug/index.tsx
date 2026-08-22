import { createFileRoute, notFound } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/content/repository";
import { categoryBySlug } from "#/data/navigation";

export const Route = createFileRoute("/categories/$slug/")({
  loader: async ({ params }) => {
    const category = categoryBySlug(params.slug);
    if (!category) throw notFound();
    return { posts: await postRepository.list({ category: category.slug }) };
  },
  component: CategoryIndexPage,
});

function CategoryIndexPage() {
  const { slug } = Route.useParams();
  const { posts } = Route.useLoaderData();
  return <CategoryPageContent slug={slug} page={1} posts={posts} />;
}
