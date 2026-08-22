import { Link } from "@tanstack/react-router";

import type { Post } from "#/data/posts";
import { formatDate } from "#/data/posts";

export function PostCard({ post }: { post: Post }) {
  return (
    <li className="flex items-center gap-5 rounded-[10px] border-b border-line px-4 py-[30px] transition-colors duration-150 hover:bg-card max-[480px]:gap-3">
      <div className="min-w-0 flex-1">
        <Link
          className="text-[1.15rem] font-semibold tracking-[-0.01em] no-underline"
          to="/posts/$slug"
          params={{ slug: post.slug }}
        >
          {post.title}
        </Link>
        <time className="mt-1 block text-[0.85rem] tabular-nums text-muted" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
        <p className="mb-0 mt-2 text-[0.95rem] text-muted">{post.description}</p>
      </div>
      {post.cover && (
        <Link
          className="block h-[150px] w-[210px] shrink-0 overflow-hidden rounded-xl border border-line no-underline max-[480px]:h-24 max-[480px]:w-32"
          to="/posts/$slug"
          params={{ slug: post.slug }}
          aria-label={post.title}
        >
          <img
            className="block h-full w-full object-cover"
            src={post.cover}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </Link>
      )}
    </li>
  );
}
