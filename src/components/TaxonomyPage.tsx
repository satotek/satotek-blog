import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { PostSummary } from "#/content/types";
import { categoryBySlug } from "#/data/navigation";
import { paginate, POSTS_PER_PAGE } from "#/lib/pagination";

import { PostCard } from "./PostCard";

type PaginationProps = {
  current: number;
  total: number;
};

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

  if (!category) {
    return <TaxonomyNotFound label="カテゴリ" to="/categories" />;
  }

  const items = posts;
  const { slice, current, total } = paginate(items, page);

  if (page > total) {
    return <TaxonomyNotFound label="カテゴリ" to="/categories" />;
  }

  return (
    <section>
      <h2 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {category.slug}
        {total > 1 && (
          <span className="ml-1.5 normal-case font-normal tracking-normal">
            （{current} / {total}）
          </span>
        )}
      </h2>
      {items.length > 0 ? (
        <>
          <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
            {slice.map((post) => (
              <PostCard key={post.slug} post={post} variant="list" />
            ))}
          </ul>
          <CategoryPagination slug={category.slug} current={current} total={total} />
        </>
      ) : (
        <p className="py-6 text-muted">このカテゴリの記事はまだありません。</p>
      )}
    </section>
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
  const items = posts;

  if (items.length === 0 || page > Math.max(1, Math.ceil(items.length / POSTS_PER_PAGE))) {
    return <TaxonomyNotFound label="タグ" to="/tags" />;
  }

  const { slice, current, total } = paginate(items, page);

  return (
    <section>
      <h2 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        #{tag}
        {total > 1 && (
          <span className="ml-1.5 normal-case font-normal tracking-normal">
            （{current} / {total}）
          </span>
        )}
      </h2>
      <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
        {slice.map((post) => (
          <PostCard key={post.slug} post={post} variant="list" />
        ))}
      </ul>
      <TagPagination tag={tag} current={current} total={total} />
    </section>
  );
}

function CategoryPagination({ slug, current, total }: PaginationProps & { slug: string }) {
  if (total <= 1) return null;

  return (
    <PaginationFrame current={current} total={total}>
      {current > 1 ? (
        <CategoryPageLink slug={slug} page={current - 1} edge>
          ← 前へ
        </CategoryPageLink>
      ) : (
        <span className="text-muted/45">← 前へ</span>
      )}
      <PaginationNumbers>
        {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            {page === current ? (
              <span
                className="inline-flex min-w-8 items-center justify-center rounded-full bg-accent-soft px-2 py-1 text-accent"
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <CategoryPageLink slug={slug} page={page}>
                {page}
              </CategoryPageLink>
            )}
          </li>
        ))}
      </PaginationNumbers>
      {current < total ? (
        <CategoryPageLink slug={slug} page={current + 1} edge>
          次へ →
        </CategoryPageLink>
      ) : (
        <span className="text-muted/45">次へ →</span>
      )}
    </PaginationFrame>
  );
}

function TagPagination({ tag, current, total }: PaginationProps & { tag: string }) {
  if (total <= 1) return null;

  return (
    <PaginationFrame current={current} total={total}>
      {current > 1 ? (
        <TagPageLink tag={tag} page={current - 1} edge>
          ← 前へ
        </TagPageLink>
      ) : (
        <span className="text-muted/45">← 前へ</span>
      )}
      <PaginationNumbers>
        {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            {page === current ? (
              <span
                className="inline-flex min-w-8 items-center justify-center rounded-full bg-accent-soft px-2 py-1 text-accent"
                aria-current="page"
              >
                {page}
              </span>
            ) : (
              <TagPageLink tag={tag} page={page}>
                {page}
              </TagPageLink>
            )}
          </li>
        ))}
      </PaginationNumbers>
      {current < total ? (
        <TagPageLink tag={tag} page={current + 1} edge>
          次へ →
        </TagPageLink>
      ) : (
        <span className="text-muted/45">次へ →</span>
      )}
    </PaginationFrame>
  );
}

function PaginationFrame({ children }: PaginationProps & { children: ReactNode }) {
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-5 border-t border-line py-5 text-[0.85rem]"
      aria-label="ページ送り"
    >
      {children}
    </nav>
  );
}

function PaginationNumbers({ children }: { children: ReactNode }) {
  return <ul className="m-0 flex list-none items-center gap-1.5 p-0">{children}</ul>;
}

function CategoryPageLink({
  slug,
  page,
  edge = false,
  children,
}: {
  slug: string;
  page: number;
  edge?: boolean;
  children: ReactNode;
}) {
  const className = edge
    ? "text-accent no-underline hover:underline"
    : "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-accent no-underline hover:bg-accent-soft";

  if (page === 1) {
    return (
      <Link className={className} to="/categories/$slug" params={{ slug }}>
        {children}
      </Link>
    );
  }

  return (
    <Link
      className={className}
      to="/categories/$slug/page/$page"
      params={{ slug, page: String(page) }}
    >
      {children}
    </Link>
  );
}

function TagPageLink({
  tag,
  page,
  edge = false,
  children,
}: {
  tag: string;
  page: number;
  edge?: boolean;
  children: ReactNode;
}) {
  const className = edge
    ? "text-accent no-underline hover:underline"
    : "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-accent no-underline hover:bg-accent-soft";

  if (page === 1) {
    return (
      <Link className={className} to="/tags/$tag" params={{ tag }}>
        {children}
      </Link>
    );
  }

  return (
    <Link className={className} to="/tags/$tag/page/$page" params={{ tag, page: String(page) }}>
      {children}
    </Link>
  );
}

function TaxonomyNotFound({ label, to }: { label: string; to: "/categories" | "/tags" }) {
  return (
    <section className="mx-auto max-w-[820px] px-4 pb-12 pt-2 text-center sm:px-6">
      <p className="m-0 mt-2 text-[clamp(64px,18vw,120px)] leading-none tracking-[0.02em] text-accent">
        404
      </p>
      <p className="m-0 mt-2 text-[1.1rem]">{label}が見つかりません。</p>
      <Link className="text-accent underline underline-offset-2" to={to}>
        ← {label}一覧へ戻る
      </Link>
    </section>
  );
}
