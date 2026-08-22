import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { PostSummary } from "#/content/types";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";

import { PostCover } from "./PostCard";

export function FeaturedPostCard({ post }: { post: PostSummary }) {
  const category = categoryBySlug(post.category);

  return (
    <li className="featured-post group">
      <PostCover
        post={post}
        className="featured-post__cover"
        sizes="(max-width: 800px) 100vw, 50vw"
      />
      <div className="featured-post__body">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.06em] text-muted">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">/</span>
          <Link
            className="text-accent no-underline hover:underline"
            to="/categories/$slug"
            params={{ slug: post.category }}
          >
            {category?.name ?? post.category}
          </Link>
        </div>
        <Link
          className="mt-4 block text-[clamp(1.45rem,3.5vw,2.3rem)] font-bold leading-[1.1] tracking-[-0.04em] no-underline transition-colors hover:text-accent"
          to="/posts/$slug"
          params={{ slug: post.slug }}
        >
          {post.title}
        </Link>
        <p className="mb-0 mt-4 max-w-[600px] text-[0.97rem] leading-[1.8] text-muted">
          {post.description}
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 font-semibold text-accent no-underline transition-[gap] duration-200 hover:gap-3 motion-reduce:transition-none"
          to="/posts/$slug"
          params={{ slug: post.slug }}
        >
          この記事を読む
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}
