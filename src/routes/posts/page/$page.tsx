import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { PostList } from "#/components/PostList";
import { PostsPagination } from "#/components/PostsPagination";
import { SectionHeading } from "#/components/SectionHeading";
import type { PostSummary } from "#/content/types";
import { postRepository } from "#/content/repository";
import { paginate, parsePage, POSTS_PER_PAGE } from "#/lib/pagination";
import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/posts/page/$page")({
  loader: async ({ params }): Promise<PostsPageLoaderData> => {
    const page = parsePage(params.page);
    const posts = await postRepository.list();
    const total = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

    if (page === null || page > total) throw notFound();
    if (page === 1) {
      throw redirect({
        to: "/posts",
        statusCode: 301,
        throw: true,
      });
    }

    const paginated = paginate(posts, page);
    return {
      slice: paginated.slice,
      current: paginated.current,
      total: paginated.total,
      totalPosts: posts.length,
    };
  },
  head: ({ params }) => ({
    meta: [
      { title: `記事一覧（${params.page}ページ目） | satotek.dev` },
      { name: "description", content: `記事一覧（${params.page}ページ目）` },
      ...createSocialMeta({
        title: `記事一覧（${params.page}ページ目） | satotek.dev`,
        description: `記事一覧（${params.page}ページ目）`,
        url: `${SITE_URL}/posts/page/${params.page}`,
      }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/posts/page/${params.page}` }],
  }),
  component: PostsNumberedPage,
});

function PostsNumberedPage() {
  const { slice, current, total, totalPosts } = Route.useLoaderData();

  return (
    <section>
      <SectionHeading
        eyebrow="Journal"
        title="記事一覧"
        description={`${totalPosts}件の記事 / ${current}ページ目`}
      />
      <PostList posts={slice} variant="list" />
      <PostsPagination current={current} total={total} />
    </section>
  );
}

type PostsPageLoaderData = {
  slice: readonly PostSummary[];
  current: number;
  total: number;
  totalPosts: number;
};
