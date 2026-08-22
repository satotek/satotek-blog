import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { categoryBySlug } from "#/data/navigation";
import { findPost, formatDate } from "#/data/posts";
import { SITE_URL } from "#/lib/site";

const REACTIONS = ["👍", "❤️", "🎉", "👀"];

export const Route = createFileRoute("/posts/$slug")({
  head: ({ params }) => {
    const post = findPost(params.slug);
    const title = post?.title ?? "記事";
    const description = post?.description ?? "個人ブログ・技術メモ";

    return {
      meta: [
        { title: `${title} | satotek.dev` },
        { name: "description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(post ? [{ property: "article:published_time", content: post.date }] : []),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/posts/${params.slug}` }],
    };
  },
  loader: ({ params }) => {
    if (!findPost(params.slug)) throw notFound();
    return null;
  },
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const post = findPost(slug);

  if (!post) {
    return (
      <section className="mx-auto max-w-[820px] px-4 pb-12 pt-2 text-center sm:px-6">
        <p className="m-0 mt-2 text-[clamp(64px,18vw,120px)] leading-none tracking-[0.02em] text-accent">
          404
        </p>
        <p className="m-0 mt-2 text-[1.1rem]">記事が見つかりません。</p>
        <p className="mb-6 mt-1.5 text-muted">指定された記事はまだ公開されていません。</p>
        <Link className="text-accent underline underline-offset-2" to="/">
          ← Homeへ戻る
        </Link>
      </section>
    );
  }

  const category = categoryBySlug(post.category);
  const readingMinutes = Math.max(1, Math.ceil(post.paragraphs.join("").length / 500));

  return (
    <article className="w-full">
      <header className="mb-10 mt-3 border-b border-line pb-6">
        <h1 className="m-0 mb-3 text-[clamp(1.9rem,5vw,2.6rem)] font-bold leading-[1.15] tracking-[-0.02em]">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <time className="text-[0.9rem] tabular-nums text-muted" dateTime={post.date}>
            {formatDate(post.date)}
          </time>
          {category ? (
            <Link
              className="rounded-full bg-accent-soft px-3 py-0.5 text-[0.8rem] font-semibold text-accent no-underline transition-colors hover:bg-accent-hover"
              to="/categories/$slug"
              params={{ slug: category.slug }}
            >
              {category.name}
            </Link>
          ) : (
            <span className="rounded-full bg-accent-soft px-3 py-0.5 text-[0.8rem] font-semibold text-accent">
              {post.category}
            </span>
          )}
          <span className="text-[0.9rem] tabular-nums text-muted">
            約{readingMinutes}分で読めます
          </span>
        </div>
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0" aria-label="タグ">
          {post.tags.map((tag) => (
            <li
              className="rounded-full border border-line text-[0.8rem] transition-colors hover:border-accent-border"
              key={tag}
            >
              <Link
                className="block px-3 py-[3px] text-muted no-underline hover:text-ink"
                to="/tags/$tag"
                params={{ tag }}
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <div className="text-[1.0625rem] leading-[1.75] sm:text-[1.125rem] sm:leading-[1.85] [&_p]:my-[1.25em] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
        {post.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div
        className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
        aria-label="記事へのリアクション"
      >
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((emoji) => (
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-transparent px-3 py-1.5 text-[0.95rem] text-ink transition-[background,border-color,transform] duration-150 hover:border-accent-border hover:bg-accent-soft active:scale-[0.94]"
              type="button"
              key={emoji}
            >
              <span className="text-[1.05rem] leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="min-w-[1ch] text-[0.85rem] tabular-nums text-muted">–</span>
            </button>
          ))}
        </div>
        <span className="text-[0.85rem] tabular-nums text-muted">– views</span>
      </div>
    </article>
  );
}
