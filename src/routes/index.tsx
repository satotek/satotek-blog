import { createFileRoute } from "@tanstack/react-router";

import { PostCard } from "#/components/PostCard";
import { posts } from "#/data/posts";
import { POSTS_PER_PAGE } from "#/lib/pagination";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const latest = posts.slice(0, POSTS_PER_PAGE);

  return (
    <section>
      <h2 className="mb-5 flex items-baseline justify-between gap-3 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        <span>Latest posts</span>
        <span className="normal-case font-normal tracking-normal tabular-nums">
          最新 {latest.length} 件 / 全 {posts.length} 件
        </span>
      </h2>
      <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
        {latest.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </ul>
    </section>
  );
}
