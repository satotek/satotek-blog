import type { PostSummary } from "#/lib/posts/types";

import { PostCard, type PostCardVariant } from "./PostCard";

export function PostList({
  posts,
  variant = "list",
  enter = false,
  enterFrom = 0,
  mobileLimit,
}: {
  posts: readonly PostSummary[];
  variant?: PostCardVariant;
  /** 上から順に、少し遅らせて出す。 */
  enter?: boolean;
  /** 先頭カードの遅れ。上に別の塊があるとき、その続きから始める。 */
  enterFrom?: number;
  /** この件数より後ろは、サイドバーが出ない幅では隠す。 */
  mobileLimit?: number;
}) {
  return (
    <ul
      className={
        variant === "grid"
          ? "m-0 grid list-none gap-x-5 gap-y-8 p-0 sm:grid-cols-2"
          : variant === "panel"
            ? "post-index m-0 grid list-none gap-3 p-0 sm:gap-4"
            : "m-0 grid list-none gap-0 border-t border-line p-0"
      }
    >
      {posts.map((post, index) => (
        <PostCard
          key={post.slug}
          post={post}
          variant={variant}
          enterIndex={enter ? index + enterFrom : undefined}
          className={
            mobileLimit !== undefined && index >= mobileLimit ? "max-sm:hidden" : undefined
          }
        />
      ))}
    </ul>
  );
}
