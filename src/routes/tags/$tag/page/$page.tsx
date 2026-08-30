import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { TagPageContent } from "#/components/TaxonomyPage";
import { postRepository } from "#/lib/posts/repository";
import { createPageHead, withSiteName } from "#/lib/site";
import { parsePage, POSTS_PER_PAGE } from "#/lib/pagination";

export const Route = createFileRoute("/tags/$tag/page/$page")({
  loader: async ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    const page = parsePage(params.page);
    const posts = await postRepository.list({ tag });
    const itemCount = posts.length;
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
    return { posts };
  },
  head: ({ params }) => {
    const tag = decodeURIComponent(params.tag);

    return createPageHead({
      title: withSiteName(`タグ: ${tag}（${params.page}ページ目）`),
      description: `「${tag}」の記事一覧（${params.page}ページ目）`,
      path: `/tags/${encodeURIComponent(tag)}/page/${params.page}`,
    });
  },
  component: TagNumberedPage,
});

function TagNumberedPage() {
  const { tag: encodedTag, page: rawPage } = Route.useParams();
  const { posts } = Route.useLoaderData();
  const page = parsePage(rawPage);

  return page === null ? null : (
    <TagPageContent tag={decodeURIComponent(encodedTag)} page={page} posts={posts} />
  );
}
