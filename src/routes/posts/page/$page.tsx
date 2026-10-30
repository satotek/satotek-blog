import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { PostFilters } from "#/components/PostFilters";
import { PostList } from "#/components/PostList";
import { Pagination, type PageLinkProps } from "#/components/Pagination";
import { SectionHeading } from "#/components/SectionHeading";
import { RouterLink } from "#/components/ui";
import { getPostFilters, type PostFilters as PostFiltersData } from "#/data/navigation";
import type { PostSummary } from "@satotek/blog-core/posts/types";
import { postRepository } from "#/lib/posts/repository";
import { paginate, parsePage, POSTS_PER_PAGE } from "#/lib/pagination";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/posts/page/$page")({
  loader: async ({ params }): Promise<PostsPageLoaderData> => {
    const page = parsePage(params.page);
    const [posts, filters] = await Promise.all([postRepository.list(), getPostFilters()]);
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
      filters,
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
  const { slice, current, total, totalPosts, filters } = Route.useLoaderData();

  return (
    <section>
      <SectionHeading
        eyebrow="Journal"
        title="記事一覧"
        description={`${totalPosts}件の記事 / ${current}ページ目`}
      />
      <div className="rise-enter" style={{ "--i": 0 } as CSSProperties}>
        <PostFilters filters={filters} totalPosts={totalPosts} />
      </div>
      <PostList posts={slice} variant="grid" enter enterFrom={1} />
      <Pagination current={current} total={total} PageLink={PostsPageLink} className="mt-6" />
    </section>
  );
}

type PostsPageLoaderData = {
  slice: readonly PostSummary[];
  current: number;
  total: number;
  totalPosts: number;
  filters: PostFiltersData;
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
