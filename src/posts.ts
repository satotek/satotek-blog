import type { PostSummary } from "#/core/posts/types";

import { getCategories, getPostFilters, getTags } from "#/data/navigation";
import { postRepository } from "#/lib/posts/repository";
import { POSTS_PER_PAGE } from "#/lib/pagination";

export { getCategories, getPostFilters, getTags, postRepository };

/** 1ページ目は /posts などの素の URL なので、getPrerenderPaths には 2 ページ目以降だけ返す。 */
export function extraPages(count: number) {
  const total = Math.max(1, Math.ceil(count / POSTS_PER_PAGE));
  return Array.from({ length: total - 1 }, (_, index) => index + 2);
}

/** 関連記事の並べ方：タグの一致を2点、カテゴリの一致を1点。 */
export function relatedPosts(post: PostSummary, posts: readonly PostSummary[]) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      post: candidate,
      score:
        candidate.tags.filter((tag) => post.tags.includes(tag)).length * 2 +
        (candidate.category === post.category ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) => right.score - left.score || right.post.date.localeCompare(left.post.date),
    )
    .slice(0, 3)
    .map(({ post: candidate }) => candidate);
}
