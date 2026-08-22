import { Bot, Rss } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type { PostSummary } from "#/content/types";
import type { TagCount } from "./TagList";

type CategoryCount = {
  slug: string;
  name: string;
  count: number;
};

export function HomeSidebar({
  highlights,
  hasPopularPosts,
  categories,
  tags,
}: {
  highlights: readonly PostSummary[];
  hasPopularPosts: boolean;
  categories: readonly CategoryCount[];
  tags: readonly TagCount[];
}) {
  return (
    <aside className="grid gap-3" aria-label="サイドバー">
      {highlights.length > 0 && (
        <section className="panel p-5" aria-labelledby="highlights-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="highlights-title">
              {hasPopularPosts ? "よく読まれている" : "Pick up"}
            </h2>
            {hasPopularPosts && (
              <span className="font-mono text-[0.66rem] tracking-[0.06em] text-muted">
                直近30日
              </span>
            )}
          </div>
          <ol className="m-0 mt-3 grid list-none gap-0.5 p-0">
            {highlights.slice(0, 4).map((post, index) => (
              <li
                className={`grid items-baseline gap-2.5 rounded-[10px] px-2 py-2.5 ${
                  hasPopularPosts ? "grid-cols-[26px_minmax(0,1fr)]" : "grid-cols-1"
                } ${hasPopularPosts && index === 0 ? "bg-accent-soft" : ""}`}
                key={post.slug}
              >
                {hasPopularPosts && (
                  <span
                    className={`font-mono text-[0.95rem] font-semibold ${
                      index === 0 ? "text-accent" : "text-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <Link
                  className="text-[0.88rem] font-bold leading-[1.55] tracking-[-0.01em] no-underline hover:text-accent"
                  to="/posts/$slug"
                  params={{ slug: post.slug }}
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="panel p-5" aria-labelledby="categories-title">
        <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="categories-title">
          カテゴリ
        </h2>
        <ul className="m-0 mt-2.5 grid list-none gap-0.5 p-0">
          {categories.map(({ slug, name, count }) => (
            <li key={slug}>
              <Link
                className="flex items-baseline justify-between rounded-[9px] px-2 py-[7px] text-[0.9rem] font-semibold no-underline transition-colors duration-150 hover:bg-hover hover:text-accent"
                to="/categories/$slug"
                params={{ slug }}
              >
                <span>{name}</span>
                <span className="font-mono text-[0.74rem] tabular-nums text-muted">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-5" aria-labelledby="tags-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="tags-title">
            タグ
          </h2>
          <Link
            className="text-[0.78rem] font-semibold text-accent no-underline hover:underline"
            to="/tags"
          >
            すべて →
          </Link>
        </div>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
          {tags.slice(0, 8).map(({ name }) => (
            <li key={name}>
              <Link
                className="inline-block rounded-full border border-line px-2.5 py-[3px] text-[0.78rem] text-muted no-underline transition-colors duration-150 hover:border-accent-border hover:text-accent"
                to="/tags/$tag"
                params={{ tag: name }}
              >
                #{name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel flex items-center justify-between px-5 py-4" aria-label="購読">
        <p className="m-0 text-[0.78rem] font-bold text-muted">購読</p>
        <div className="flex gap-2">
          <a
            className="inline-flex size-[34px] items-center justify-center rounded-full border border-line text-muted no-underline transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
            href="/feed.xml"
            aria-label="RSS フィード"
          >
            <Rss className="size-[17px]" aria-hidden="true" />
          </a>
          <a
            className="inline-flex size-[34px] items-center justify-center rounded-full border border-line text-muted no-underline transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
            href="/llms.txt"
            aria-label="llms.txt（LLM 向けサイト情報）"
          >
            <Bot className="size-[17px]" aria-hidden="true" />
          </a>
        </div>
      </section>
    </aside>
  );
}
