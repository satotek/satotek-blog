import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";
import { categoryBySlug } from "#/data/navigation";
import { posts } from "#/data/posts";
import { parsePage, POSTS_PER_PAGE } from "#/lib/pagination";

export const Route = createFileRoute("/categories/$slug/page/$page")({
  loader: ({ params }) => {
    const category = categoryBySlug(params.slug);
    const page = parsePage(params.page);
    const itemCount = category ? posts.filter((post) => post.category === category.slug).length : 0;
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
    return null;
  },
  component: CategoryNumberedPage,
});

function CategoryNumberedPage() {
  const { slug, page: rawPage } = Route.useParams();
  const page = parsePage(rawPage);

  return page === null ? null : <CategoryPageContent slug={slug} page={page} />;
}
