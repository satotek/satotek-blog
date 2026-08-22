import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { PostSummary } from "#/content/types";
import { categoryBySlug } from "#/data/navigation";
import { paginate } from "#/lib/pagination";

import { NotFound } from "./NotFound";
import { Pagination, type PageLinkProps } from "./Pagination";
import { PostCard } from "./PostCard";

export function CategoryPageContent({
  slug,
  page,
  posts,
}: {
  slug: string;
  page: number;
  posts: readonly PostSummary[];
}) {
  const category = categoryBySlug(slug);
  const { slice, current, total } = paginate(posts, page);

  if (!category || page > total) {
    return <TaxonomyNotFound label="カテゴリ" to="/categories" />;
  }

  const CategoryPageLink = ({ page: target, className, children }: PageLinkProps) =>
    target === 1 ? (
      <Link className={className} to="/categories/$slug" params={{ slug: category.slug }}>
        {children}
      </Link>
    ) : (
      <Link
        className={className}
        to="/categories/$slug/page/$page"
        params={{ slug: category.slug, page: String(target) }}
      >
        {children}
      </Link>
    );

  return (
    <TaxonomySection heading={category.slug} current={current} total={total}>
      {posts.length > 0 ? (
        <>
          <PostRows posts={slice} />
          <Pagination current={current} total={total} PageLink={CategoryPageLink} />
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
}: {
  tag: string;
  page: number;
  posts: readonly PostSummary[];
}) {
  const { slice, current, total } = paginate(posts, page);

  if (posts.length === 0 || page > total) {
    return <TaxonomyNotFound label="タグ" to="/tags" />;
  }

  const TagPageLink = ({ page: target, className, children }: PageLinkProps) =>
    target === 1 ? (
      <Link className={className} to="/tags/$tag" params={{ tag }}>
        {children}
      </Link>
    ) : (
      <Link className={className} to="/tags/$tag/page/$page" params={{ tag, page: String(target) }}>
        {children}
      </Link>
    );

  return (
    <TaxonomySection heading={`#${tag}`} current={current} total={total}>
      <PostRows posts={slice} />
      <Pagination current={current} total={total} PageLink={TagPageLink} />
    </TaxonomySection>
  );
}

function TaxonomySection({
  heading,
  current,
  total,
  children,
}: {
  heading: string;
  current: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {heading}
        {total > 1 && (
          <span className="ml-1.5 font-normal normal-case tracking-normal">
            （{current} / {total}）
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

function PostRows({ posts }: { posts: readonly PostSummary[] }) {
  return (
    <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} variant="list" />
      ))}
    </ul>
  );
}

function TaxonomyNotFound({ label, to }: { label: string; to: "/categories" | "/tags" }) {
  return (
    <NotFound title={`${label}が見つかりません。`}>
      <Link className="text-accent underline underline-offset-2" to={to}>
        ← {label}一覧へ戻る
      </Link>
    </NotFound>
  );
}
