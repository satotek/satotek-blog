import type { ReactNode } from "react";

import type { PostSummary } from "@satotek/blog-core/posts/types";
import { RouterLink } from "#/components/ui";
import { categoryBySlug, type PostFilters as PostFiltersData } from "#/data/navigation";
import { paginate } from "#/lib/pagination";

import { NotFound } from "./NotFound";
import { Pagination, type PageLinkProps } from "./Pagination";
import { PostFilters } from "./PostFilters";
import { PostList } from "./PostList";
import { SectionHeading } from "./SectionHeading";

export function CategoryPageContent({
  slug,
  page,
  posts,
  filters,
}: {
  slug: string;
  page: number;
  posts: readonly PostSummary[];
  filters: PostFiltersData;
}) {
  const category = categoryBySlug(slug);
  const { slice, current, total } = paginate(posts, page);

  if (!category || page > total) {
    return <TaxonomyNotFound label="カテゴリ" />;
  }

  const CategoryPageLink = ({ page: target, className, children }: PageLinkProps) =>
    target === 1 ? (
      <RouterLink className={className} to="/categories/$slug" params={{ slug: category.slug }}>
        {children}
      </RouterLink>
    ) : (
      <RouterLink
        className={className}
        to="/categories/$slug/page/$page"
        params={{ slug: category.slug, page: String(target) }}
      >
        {children}
      </RouterLink>
    );

  return (
    <TaxonomySection
      eyebrow="Category"
      title={category.name}
      count={posts.length}
      current={current}
      total={total}
      filters={filters}
      active={{ category: category.slug }}
    >
      {posts.length > 0 ? (
        <>
          <PostGrid posts={slice} />
          <Pagination
            current={current}
            total={total}
            PageLink={CategoryPageLink}
            className="mt-6"
          />
        </>
      ) : (
        <p className="py-6 text-muted">このカテゴリの記事はまだありません。</p>
      )}
    </TaxonomySection>
  );
}

export function TagPageContent({
  tag,
  page,
  posts,
  filters,
}: {
  tag: string;
  page: number;
  posts: readonly PostSummary[];
  filters: PostFiltersData;
}) {
  const { slice, current, total } = paginate(posts, page);

  if (posts.length === 0 || page > total) {
    return <TaxonomyNotFound label="タグ" />;
  }

  const TagPageLink = ({ page: target, className, children }: PageLinkProps) =>
    target === 1 ? (
      <RouterLink className={className} to="/tags/$tag" params={{ tag }}>
        {children}
      </RouterLink>
    ) : (
      <RouterLink
        className={className}
        to="/tags/$tag/page/$page"
        params={{ tag, page: String(target) }}
      >
        {children}
      </RouterLink>
    );

  return (
    <TaxonomySection
      eyebrow="Tag"
      title={`#${tag}`}
      count={posts.length}
      current={current}
      total={total}
      filters={filters}
      active={{ tag }}
    >
      <PostGrid posts={slice} />
      <Pagination current={current} total={total} PageLink={TagPageLink} className="mt-6" />
    </TaxonomySection>
  );
}

function TaxonomySection({
  eyebrow,
  title,
  count,
  current,
  total,
  filters,
  active,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  current: number;
  total: number;
  filters: PostFiltersData;
  active: { category: string } | { tag: string };
  children: ReactNode;
}) {
  const totalPosts = filters.categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <section>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={`${count}件の記事${total > 1 ? ` / ${current}ページ目` : ""}`}
      />
      <PostFilters filters={filters} totalPosts={totalPosts} active={active} />
      {children}
    </section>
  );
}

function PostGrid({ posts }: { posts: readonly PostSummary[] }) {
  return <PostList posts={posts} variant="grid" />;
}

function TaxonomyNotFound({ label }: { label: string }) {
  return (
    <NotFound title={`${label}が見つかりません。`}>
      <RouterLink className="text-accent underline underline-offset-2" to="/posts">
        ← 記事一覧へ戻る
      </RouterLink>
    </NotFound>
  );
}
