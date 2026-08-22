import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { TagPageContent } from "#/components/TaxonomyPage";
import { posts } from "#/data/posts";
import { parsePage, POSTS_PER_PAGE } from "#/lib/pagination";

export const Route = createFileRoute("/tags/$tag/page/$page")({
  loader: ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    const page = parsePage(params.page);
    const itemCount = posts.filter((post) => post.tags.includes(tag)).length;
    const total = Math.max(1, Math.ceil(itemCount / POSTS_PER_PAGE));

    if (itemCount === 0 || page === null || page > total) throw notFound();
    if (page === 1) {
      throw redirect({
        to: "/tags/$tag",
        params: { tag: params.tag },
        statusCode: 301,
        throw: true,
      });
    }
    return null;
  },
  component: TagNumberedPage,
});

function TagNumberedPage() {
  const { tag: encodedTag, page: rawPage } = Route.useParams();
  const page = parsePage(rawPage);

  return page === null ? null : <TagPageContent tag={decodeURIComponent(encodedTag)} page={page} />;
}
