import { createFileRoute } from "@tanstack/react-router";

import { PostList } from "#/components/PostList";
import { SectionHeading } from "#/components/SectionHeading";
import { postRepository } from "#/content/repository";
import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/posts/")({
  head: () => ({
    meta: [{ title: "記事一覧 | satotek.dev" }],
    links: [{ rel: "canonical", href: `${SITE_URL}/posts` }],
  }),
  loader: async () => ({ posts: await postRepository.list() }),
  component: PostsIndexPage,
});

function PostsIndexPage() {
  const { posts } = Route.useLoaderData();

  return (
    <section>
      <SectionHeading eyebrow="Journal" title="記事一覧" description={`${posts.length}件の記事`} />
      {posts.length > 0 ? (
        <PostList posts={posts} variant="list" />
      ) : (
        <p className="py-6 text-muted">公開中の記事はありません。</p>
      )}
    </section>
  );
}
