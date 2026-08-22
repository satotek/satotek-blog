import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { PostSummary } from "#/content/types";
import { ResponsiveImage } from "#/components/ResponsiveImage";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";

export type PostCardVariant = "grid" | "list" | "panel";

export function PostCard({
  post,
  variant = "grid",
}: {
  post: PostSummary;
  variant?: PostCardVariant;
}) {
  const category = categoryBySlug(post.category);

  if (variant === "panel") {
    return (
      <li className="panel group grid min-w-0 grid-cols-[118px_minmax(0,1fr)] gap-3.5 p-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-5">
        <PostCover
          post={post}
          className="h-[88px] rounded-xl border border-line sm:h-[118px]"
          sizes="(max-width: 640px) 100vw, 280px"
        />
        <div className="min-w-0 pr-1">
          <PostMeta post={post} category={category?.name ?? post.category} />
          <PostTitle
            post={post}
            className="mt-1.5 block text-[1.05rem] tracking-[-0.025em] sm:text-[1.22rem]"
          />
          <p className="mb-0 mt-1.5 line-clamp-2 text-[0.88rem] leading-[1.75] text-muted">
            {post.description}
          </p>
          <PostTags post={post} />
        </div>
      </li>
    );
  }

  if (variant === "list") {
    return (
      <li className="group flex min-w-0 items-center gap-[clamp(1rem,3vw,2rem)] border-b border-line py-7">
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
          sizes="160px"
        />
      </li>
    );
  }

  return (
    <li className="group min-w-0 transition-transform duration-[180ms] hover:-translate-y-[2px] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <PostCover
        post={post}
        className="aspect-[1.45] rounded-site border border-line"
        sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 50vw, 33vw"
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
    <Link
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
    </Link>
  );
}

function PostTitle({ post, className }: { post: PostSummary; className: string }) {
  return (
    <Link
      className={`font-semibold leading-[1.3] tracking-[-0.015em] no-underline transition-colors hover:text-accent ${className}`}
      to="/posts/$slug"
      params={{ slug: post.slug }}
    >
      {post.title}
    </Link>
  );
}

export function PostMeta({ post, category }: { post: PostSummary; category: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted">
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      <span aria-hidden="true">/</span>
      <Link
        className="text-accent no-underline hover:underline"
        to="/categories/$slug"
        params={{ slug: post.category }}
      >
        {category}
      </Link>
    </div>
  );
}

function PostTags({ post }: { post: PostSummary }) {
  if (post.tags.length === 0) return null;

  return (
    <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-3 gap-y-1 p-0" aria-label="タグ">
      {post.tags.slice(0, 3).map((tag) => (
        <li key={tag}>
          <Link
            className="text-[0.75rem] text-muted no-underline hover:text-accent"
            to="/tags/$tag"
            params={{ tag }}
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
