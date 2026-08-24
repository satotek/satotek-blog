import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { PostList } from "#/components/PostList";
import { Pagination, type PageLinkProps } from "#/components/Pagination";
import { SectionHeading } from "#/components/SectionHeading";
import { RouterLink } from "#/components/ui";
import type { PostSummary } from "#/content/types";
import { postRepository } from "#/content/repository";
import { paginate, parsePage, POSTS_PER_PAGE } from "#/lib/pagination";
import { createPageHead, withSiteName } from "#/lib/site";

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
  head: ({ params }) =>
    createPageHead({
      title: withSiteName(`記事一覧（${params.page}ページ目）`),
      description: `記事一覧（${params.page}ページ目）`,
      path: `/posts/page/${params.page}`,
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
      <Pagination current={current} total={total} PageLink={PostsPageLink} className="mt-6" />
    </section>
  );
}

type PostsPageLoaderData = {
  slice: readonly PostSummary[];
  current: number;
  total: number;
  totalPosts: number;
};

function PostsPageLink({ page, className, children }: PageLinkProps) {
  return page === 1 ? (
    <RouterLink className={className} to="/posts">
      {children}
    </RouterLink>
  ) : (
    <RouterLink className={className} to="/posts/page/$page" params={{ page: String(page) }}>
      {children}
    </RouterLink>
  );
}
