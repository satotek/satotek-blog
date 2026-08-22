import { createFileRoute, notFound } from "@tanstack/react-router";

import { TagPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/content/repository";

export const Route = createFileRoute("/tags/$tag/")({
  loader: async ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    const posts = await postRepository.list({ tag });
    if (posts.length === 0) throw notFound();
    return { posts };
  },
  component: TagIndexPage,
});

function TagIndexPage() {
  const { tag: encodedTag } = Route.useParams();
  const { posts } = Route.useLoaderData();
  return <TagPageContent tag={decodeURIComponent(encodedTag)} page={1} posts={posts} />;
}
