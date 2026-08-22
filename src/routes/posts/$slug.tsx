import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button as AriaButton } from "react-aria-components";

import { postRepository } from "#/content/repository";
import { getPostSourceText, type Post } from "#/content/types";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import { SITE_URL } from "#/lib/site";

const REACTIONS = ["👍", "❤️", "🎉", "👀"];

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }): Promise<{ post: Post }> => {
    const post = await postRepository.findBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    const title = post?.title ?? "記事";
    const description = post?.description ?? "satotek.devの記事";

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
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();

  const category = categoryBySlug(post.category);
  const readingMinutes = Math.max(1, Math.ceil(getPostSourceText(post).length / 500));

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

      <div
        className="text-[1.0625rem] leading-[1.75] sm:text-[1.125rem] sm:leading-[1.85] [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-accent-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-accent-soft [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-[0.85rem] [&_figcaption]:text-muted [&_figure]:my-6 [&_h2]:mb-4 [&_h2]:mt-10 [&_h2:first-child]:mt-0 [&_h2]:text-[1.45rem] [&_h2]:font-bold [&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-[1.2rem] [&_h3]:font-bold [&_img]:h-auto [&_img]:max-w-full [&_img.center]:mx-auto [&_li]:my-1 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-[1.25em] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#1f2429] [&_pre]:p-4 [&_pre]:text-[0.9em] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: post.content.html }}
      />

      <div
        className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6"
        aria-label="記事へのリアクション"
      >
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map((emoji) => (
            <AriaButton
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-transparent px-3 py-1.5 text-[0.95rem] text-ink transition-[background,border-color,transform] duration-150 hover:border-accent-border hover:bg-accent-soft active:scale-[0.94]"
              type="button"
              key={emoji}
            >
              <span className="text-[1.05rem] leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="min-w-[1ch] text-[0.85rem] tabular-nums text-muted">–</span>
            </AriaButton>
          ))}
        </div>
        <span className="text-[0.85rem] tabular-nums text-muted">– views</span>
      </div>
    </article>
  );
}
