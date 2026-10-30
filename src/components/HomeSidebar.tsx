import { Bot, Rss } from "lucide-react";

import { ListeningAside } from "#/components/ListeningView";
import { Link as AriaLink, RouterLink } from "#/components/ui";
import type { MusicSnapshot } from "@satotek/blog-core/music";
import type { PostSummary } from "@satotek/blog-core/posts/types";
import type { TagCount } from "./TagList";

type CategoryCount = {
  slug: string;
  name: string;
  count: number;
};

export function HomeSidebar({
  highlights,
  listening,
  categories,
  tags,
}: {
  highlights: readonly PostSummary[];
  listening: MusicSnapshot | null;
  categories: readonly CategoryCount[];
  tags: readonly TagCount[];
}) {
  return (
    <aside className="grid gap-3" aria-label="サイドバー">
      <ListeningAside snapshot={listening} />
      {highlights.length > 0 && (
        <section className="panel p-5" aria-labelledby="highlights-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="highlights-title">
              よく読まれている
            </h2>
            <span className="font-mono text-[0.66rem] tracking-[0.06em] text-muted">直近7日</span>
          </div>
          <ol className="m-0 mt-3 grid list-none gap-0.5 p-0">
            {highlights.slice(0, 4).map((post, index) => (
              <li
                className={`grid grid-cols-[26px_minmax(0,1fr)] items-baseline gap-2.5 rounded-[10px] px-2 py-2.5 ${
                  index === 0 ? "bg-accent-soft" : ""
                }`}
                key={post.slug}
              >
                <span
                  className={`font-mono text-[0.95rem] font-semibold ${
                    index === 0 ? "text-accent" : "text-muted"
                  }`}
                >
                  {index + 1}
                </span>
                <RouterLink
                  className="text-[0.88rem] font-bold leading-[1.55] tracking-[-0.01em] no-underline hover:text-accent"
                  to="/posts/$slug"
                  params={{ slug: post.slug }}
                >
                  {post.title}
                </RouterLink>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* カテゴリとタグは記事一覧の絞り込みが本体。ここは入口として1枚にまとめる。 */}
      <section className="panel p-5" aria-labelledby="explore-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="explore-title">
            記事を探す
          </h2>
          <RouterLink
            className="text-[0.78rem] font-semibold text-accent no-underline hover:underline"
            to="/posts"
          >
            すべて →
          </RouterLink>
        </div>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0" aria-label="カテゴリ">
          {categories
            .filter(({ count }) => count > 0)
            .map(({ slug, name, count }) => (
              <li key={slug}>
                <RouterLink
                  className="inline-flex items-baseline gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[0.84rem] font-semibold text-accent no-underline transition-colors duration-150 hover:bg-accent-hover"
                  to="/categories/$slug"
                  params={{ slug }}
                >
                  {name}
                  <span className="font-mono text-[0.7rem] font-normal tabular-nums opacity-75">
                    {count}
                  </span>
                </RouterLink>
              </li>
            ))}
        </ul>
        {tags.length > 0 && (
          <ul
            className="m-0 mt-3 flex list-none flex-wrap gap-2 border-t border-line p-0 pt-3"
            aria-label="タグ"
          >
            {tags.slice(0, 8).map(({ name }) => (
              <li key={name}>
                <RouterLink
                  className="inline-block rounded-full border border-line px-2.5 py-[3px] text-[0.78rem] text-muted no-underline transition-colors duration-150 hover:border-accent-border hover:text-accent"
                  to="/tags/$tag"
                  params={{ tag: name }}
                >
                  #{name}
                </RouterLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel flex items-center justify-between px-5 py-4" aria-label="購読">
        <p className="m-0 text-[0.78rem] font-bold text-muted">購読</p>
        <div className="flex gap-2">
          <AriaLink
            className="inline-flex size-[34px] items-center justify-center rounded-full border border-line text-muted no-underline transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
            href="/feed.xml"
            aria-label="RSS フィード"
          >
            <Rss className="size-[17px]" aria-hidden="true" />
          </AriaLink>
          <AriaLink
            className="inline-flex size-[34px] items-center justify-center rounded-full border border-line text-muted no-underline transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
            href="/llms.txt"
            aria-label="llms.txt（LLM 向けサイト情報）"
          >
            <Bot className="size-[17px]" aria-hidden="true" />
          </AriaLink>
        </div>
      </section>
    </aside>
  );
}
