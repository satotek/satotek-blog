import { createFileRoute, notFound } from "@tanstack/react-router";

import { TagPageContent } from "#/components/TaxonomyPage";
import { getPostFilters } from "#/data/navigation";
import { postRepository } from "#/lib/posts/repository";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/tags/$tag/")({
  loader: async ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    const posts = await postRepository.list({ tag });
    if (posts.length === 0) throw notFound();
    return { posts, filters: await getPostFilters() };
  },
  head: ({ params }) => {
    const tag = decodeURIComponent(params.tag);

    return createPageHead({
      title: withSiteName(`タグ: ${tag}`),
      description: `「${tag}」の記事一覧`,
      path: `/tags/${encodeURIComponent(tag)}`,
    });
  },
  component: TagIndexPage,
});

function TagIndexPage() {
  const { tag: encodedTag } = Route.useParams();
  const { posts, filters } = Route.useLoaderData();
  return (
    <TagPageContent tag={decodeURIComponent(encodedTag)} page={1} posts={posts} filters={filters} />
  );
}
