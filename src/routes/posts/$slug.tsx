import { createFileRoute, notFound } from "@tanstack/react-router";
import { useRef } from "react";

import { Article } from "#/components/article/Article";
import { ArticleFooter } from "#/components/ArticleFooter";
import { TableOfContents } from "#/components/article/TableOfContents";
import { useToc } from "#/components/article/useToc";
import { RouterLink } from "#/components/ui";
import { getPostBySlug } from "#/lib/posts/posts.functions";
import { postRepository } from "#/lib/posts/repository";
import {
  getPostReadingMinutes,
  type Post,
  type PostSummary,
  type TocItem,
} from "#/lib/posts/types";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import { createPageHead, generatedPostOgImageUrl, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }): Promise<{ post: Post; relatedPosts: readonly PostSummary[] }> => {
    const post = await getPostBySlug({ data: { slug: params.slug } });
    if (!post) throw notFound();

    const relatedPosts = (await postRepository.list())
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => ({
        post: candidate,
        score:
          candidate.tags.filter((tag) => post.tags.includes(tag)).length * 2 +
          (candidate.category === post.category ? 1 : 0),
      }))
      .filter(({ score }) => score > 0)
      .sort(
        (left, right) => right.score - left.score || right.post.date.localeCompare(left.post.date),
      )
      .slice(0, 3)
      .map(({ post: candidate }) => candidate);

    return { post, relatedPosts };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    const title = post?.title ?? "記事";
    const description = post?.description ?? "satotek.devの記事";
    const generatedImage = post ? generatedPostOgImageUrl(post.slug) : undefined;
    const image = generatedImage ?? post?.cover;

    return createPageHead({
      title: withSiteName(title),
      // OGP はサイト名の接尾辞なしで記事タイトルだけを見せる。
      socialTitle: title,
      description,
      path: `/posts/${encodeURIComponent(params.slug)}`,
      image,
      imageAlt: generatedImage
        ? `${title} のOGP画像`
        : post?.cover
          ? `${title} のカバー画像`
          : undefined,
      type: "article",
      publishedTime: post?.date,
    });
  },
  component: PostPage,
});

function PostPage() {
  const { post, relatedPosts } = Route.useLoaderData();

  const category = categoryBySlug(post.category);
  const readingMinutes = getPostReadingMinutes(post);

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
            <RouterLink
              className="rounded-full bg-accent-soft px-3 py-0.5 text-[0.8rem] font-semibold text-accent no-underline transition-colors hover:bg-accent-hover"
              to="/categories/$slug"
              params={{ slug: category.slug }}
            >
              {category.name}
            </RouterLink>
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
              <RouterLink
                className="block px-3 py-[3px] text-muted no-underline hover:text-ink"
                to="/tags/$tag"
                params={{ tag }}
              >
                {tag}
              </RouterLink>
            </li>
          ))}
        </ul>
      </header>

      <PostBody post={post} />
      <ArticleFooter post={post} relatedPosts={relatedPosts} />
    </article>
  );
}

function PostBody({ post }: { post: Post }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const toc = useToc(contentRef, articleModules.get(post.slug)?.toc ?? []);

  if (!toc.hasToc) return <MarkdownContent containerRef={contentRef} post={post} />;

  return (
    <>
      {/* モバイルは本文の上、デスクトップは右サイド。DOM 上の位置が違うので
          同じ目次を 2 箇所に描いて CSS で出し分ける。状態は useToc が共有する。 */}
      <div className="toc toc-mobile">
        <TableOfContents toc={toc} />
      </div>
      <div className={`post-layout${toc.isOpen ? "" : " post-layout--toc-closed"}`}>
        <div className="post-content">
          <MarkdownContent containerRef={contentRef} post={post} />
        </div>
        <aside className="toc toc-desktop">
          <TableOfContents toc={toc} />
        </aside>
      </div>
    </>
  );
}

const slugOf = (path: string) => path.split("/").at(-2) ?? "";

type ArticleModule = {
  default: () => React.JSX.Element;
  toc: readonly TocItem[];
};

// SSR で本文を出すため eager に読む。React.lazy だとサーバー描画が本文を
// 待たずに抜け、prerender した HTML から記事が丸ごと落ちる。
const articleModules = new Map(
  Object.entries(
    import.meta.glob<ArticleModule>("../../content/posts/*/index.mdx", { eager: true }),
  ).map(([path, module]) => [slugOf(path), module]),
);

function MarkdownContent({
  containerRef,
  post,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  post: Post;
}) {
  const Body = articleModules.get(post.slug)?.default;

  return (
    <div className="markdown-content" ref={containerRef}>
      <Article>{Body ? <Body /> : null}</Article>
    </div>
  );
}
