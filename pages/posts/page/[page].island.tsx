import { Pagination, type PageLinkProps } from "#/components/Pagination";
import { PostFilters } from "#/components/PostFilters";
import { PostList } from "#/components/PostList";
import { SectionHeading } from "#/components/SectionHeading";
import type { Props } from "./[page].server";

function PostsPageLink({ page, className, children }: PageLinkProps) {
  return (
    <a className={className} href={page === 1 ? "/posts" : `/posts/page/${page}`}>
      {children}
    </a>
  );
}

export default function PostsNumberedPage({ slice, current, total, totalPosts, filters }: Props) {
  return (
    <section>
      <SectionHeading
        eyebrow="Journal"
        title="記事一覧"
        description={`${totalPosts}件の記事 / ${current}ページ目`}
      />
      <PostFilters filters={filters} totalPosts={totalPosts} />
      <PostList posts={slice} variant="grid" />
      <Pagination current={current} total={total} PageLink={PostsPageLink} className="mt-6" />
    </section>
  );
}
