import type { PostSummary } from "#/lib/posts/types";

import { PostCard, type PostCardVariant } from "./PostCard";

export function PostList({
  posts,
  variant = "list",
}: {
  posts: readonly PostSummary[];
  variant?: PostCardVariant;
}) {
  return (
    <ul
      className={
        variant === "grid"
          ? "m-0 grid list-none gap-x-5 gap-y-8 p-0 sm:grid-cols-2"
          : variant === "panel"
            ? "m-0 grid list-none gap-3 p-0"
            : "m-0 grid list-none gap-0 border-t border-line p-0"
      }
    >
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} variant={variant} />
      ))}
    </ul>
  );
}
