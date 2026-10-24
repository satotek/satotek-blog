import { useState, type CSSProperties } from "react";

import type { PostSummary } from "#/lib/posts/types";
import { ResponsiveImage } from "#/components/ResponsiveImage";
import { RouterLink } from "#/components/ui";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";

export type PostCardVariant = "grid" | "list" | "panel";

function itemProps(base: string, className?: string, enterIndex?: number) {
  return {
    className: [base, className, enterIndex === undefined ? "" : "post-enter"]
      .filter(Boolean)
      .join(" "),
    style: enterIndex === undefined ? undefined : ({ "--i": enterIndex } as CSSProperties),
  };
}

export function PostCard({
  post,
  variant = "grid",
  className,
  enterIndex,
}: {
  post: PostSummary;
  variant?: PostCardVariant;
  className?: string;
  /** 並びの何枚目か。渡すと上から順に現れる。 */
  enterIndex?: number;
}) {
  const category = categoryBySlug(post.category);

  if (variant === "panel") {
    return (
      <li
        {...itemProps(
          "post-card post-index__row group grid min-h-[4.75rem] grid-cols-[7.125rem_minmax(0,1fr)] transition-colors hover:bg-hover sm:min-h-[6.25rem] sm:grid-cols-[9.375rem_minmax(0,1fr)]",
          className,
          enterIndex,
        )}
      >
        <PostCover
          post={post}
          className="h-full min-h-[4.75rem] rounded-none sm:min-h-[6.25rem]"
          sizes="150px"
        />
        <div className="flex min-w-0 flex-col justify-center overflow-hidden px-3 py-2 sm:px-4">
          <PostMeta post={post} category={category?.name ?? post.category} />
          <PostTitle
            post={post}
            className="mt-0.5 line-clamp-2 block text-[0.92rem] leading-[1.35] tracking-[-0.02em] sm:text-[1.02rem]"
          />
          <p className="mb-0 mt-1 hidden truncate text-[0.8rem] leading-snug text-muted sm:block">
            {post.description}
          </p>
        </div>
      </li>
    );
  }

  if (variant === "list") {
    return (
      <li
        {...itemProps(
          "group flex min-w-0 items-center gap-[clamp(1rem,3vw,2rem)] border-b border-line py-7",
          className,
          enterIndex,
        )}
      >
        <div className="min-w-0 flex-1">
          <PostMeta post={post} category={category?.name ?? post.category} />
          <PostTitle post={post} className="mt-2 block text-[1.15rem]" />
          <p className="mb-0 mt-2 line-clamp-2 max-w-[700px] text-[0.95rem] text-muted">
            {post.description}
          </p>
          <PostTags post={post} />
        </div>
        <PostCover
          post={post}
          className="h-[clamp(90px,13vw,145px)] w-[clamp(125px,23vw,220px)] flex-none rounded-site border border-line"
          sizes="clamp(125px, 23vw, 220px)"
        />
      </li>
    );
  }

  return (
    <li
      {...itemProps(
        "group min-w-0 transition-transform duration-[180ms] hover:-translate-y-[2px] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
        enterIndex,
      )}
    >
      <PostCover
        post={post}
        className="aspect-[1.45] rounded-site border border-line"
        sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1120px) calc(50vw - 2rem), 526px"
      />
      <div className="pt-4">
        <PostMeta post={post} category={category?.name ?? post.category} />
        <PostTitle post={post} className="mt-2 block text-[1.1rem]" />
        <p className="mb-0 mt-2 line-clamp-3 text-[0.92rem] text-muted">{post.description}</p>
        <PostTags post={post} />
      </div>
    </li>
  );
}

// 枠線と角丸は呼び出し側が渡す。ここで既定値を持つと Tailwind の同カテゴリ
// ユーティリティ同士がぶつかり、どちらが勝つかがクラスの並び順で決まらなくなるため。
export function PostCover({
  post,
  className,
  sizes,
}: {
  post: PostSummary;
  className: string;
  sizes: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <RouterLink
      className={`post-cover group block overflow-hidden no-underline ${className}`}
      to="/posts/$slug"
      params={{ slug: post.slug }}
      aria-label={`${post.title}を読む`}
    >
      {post.cover && !imageError ? (
        <ResponsiveImage
          className="block h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          src={post.cover}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="post-cover__fallback">
          <span className="post-cover__fallback-dot" />
          <span className="post-cover__fallback-label">SATOTEK</span>
        </span>
      )}
    </RouterLink>
  );
}

function PostTitle({ post, className }: { post: PostSummary; className: string }) {
  return (
    <RouterLink
      className={`min-h-6 font-semibold leading-[1.3] tracking-[-0.015em] no-underline transition-colors hover:text-accent ${className}`}
      to="/posts/$slug"
      params={{ slug: post.slug }}
    >
      {post.title}
    </RouterLink>
  );
}

export function PostMeta({ post, category }: { post: PostSummary; category: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true">/</span>
      <RouterLink
        className="inline-flex min-h-6 min-w-6 items-center text-accent no-underline hover:underline"
        to="/categories/$slug"
        params={{ slug: post.category }}
      >
        {category}
      </RouterLink>
    </div>
  );
}

function PostTags({ post }: { post: PostSummary }) {
  if (post.tags.length === 0) return null;

  return (
    <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-3 gap-y-2 p-0" aria-label="タグ">
      {post.tags.slice(0, 3).map((tag) => (
        <li key={tag}>
          <RouterLink
            className="inline-flex min-h-12 min-w-12 items-center justify-center text-[0.75rem] text-muted no-underline hover:text-accent"
            to="/tags/$tag"
            params={{ tag }}
          >
            #{tag}
          </RouterLink>
        </li>
      ))}
    </ul>
  );
}
