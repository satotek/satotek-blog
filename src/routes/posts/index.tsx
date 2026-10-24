import { createFileRoute } from "@tanstack/react-router";

import { PostFilters } from "#/components/PostFilters";
import { PostList } from "#/components/PostList";
import { PostSearchField, PostSearchResults, usePostSearch } from "#/components/PostSearch";
import { SectionHeading } from "#/components/SectionHeading";
import { getPostFilters } from "#/data/navigation";
import { postRepository } from "#/lib/posts/repository";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/posts/")({
  head: () =>
    createPageHead({
      title: withSiteName("記事一覧"),
      description: "satotek.devの記事一覧",
      path: "/posts",
    }),
  loader: async () => {
    const [posts, filters] = await Promise.all([postRepository.list(), getPostFilters()]);
    return { posts, filters };
  },
  component: PostsIndexPage,
});

function PostsIndexPage() {
  const { posts, filters } = Route.useLoaderData();
  const search = usePostSearch();

  return (
    <section>
      <SectionHeading eyebrow="Journal" title="記事一覧" description={`${posts.length}件の記事`} />
      <PostSearchField query={search.query} onChange={search.setQuery} />
      {search.active ? (
        <PostSearchResults posts={posts} state={search.state} />
      ) : (
        <PostFilters filters={filters} totalPosts={posts.length} />
      )}
      {search.active ? null : posts.length > 0 ? (
        <PostList posts={posts} variant="grid" />
      ) : (
        <p className="py-6 text-muted">公開中の記事はありません。</p>
      )}
    </section>
  );
}
