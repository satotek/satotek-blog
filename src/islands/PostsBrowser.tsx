import type { PostSummary } from "#/core/posts/types";
import type { CSSProperties } from "react";

import { PostFilters } from "#/components/PostFilters";
import { PostList } from "#/components/PostList";
import { PostSearchField, PostSearchResults, usePostSearch } from "#/components/PostSearch";
import type { PostFilters as PostFiltersData } from "#/data/navigation";

/** 検索中は絞り込みと一覧を結果に差し替えるので、3つをまとめて1つの island にする。 */
export default function PostsBrowser({
  posts,
  filters,
}: {
  posts: readonly PostSummary[];
  filters: PostFiltersData;
}) {
  const search = usePostSearch(posts);

  return (
    <>
      <div className="rise-enter" style={{ "--i": 0 } as CSSProperties}>
        <PostSearchField query={search.query} onChange={search.setQuery} />
      </div>
      {search.active ? (
        <PostSearchResults posts={posts} state={search.state} />
      ) : (
        <>
          <div className="rise-enter" style={{ "--i": 1 } as CSSProperties}>
            <PostFilters filters={filters} totalPosts={posts.length} />
          </div>
          {posts.length > 0 ? (
            <PostList posts={posts} variant="grid" enter enterFrom={2} />
          ) : (
            <p className="py-6 text-muted">公開中の記事はありません。</p>
          )}
        </>
      )}
    </>
  );
}
