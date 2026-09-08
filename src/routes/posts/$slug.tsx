import { createFileRoute, notFound } from "@tanstack/react-router";
import { Suspense, use, useRef } from "react";

import { Article, articleComponents } from "#/components/article/Article";
import { ArticleFooter } from "#/components/ArticleFooter";
import { MobileTableOfContents, TableOfContents } from "#/components/article/TableOfContents";
import { useToc } from "#/components/article/useToc";
import { RouterLink } from "#/components/ui";
import { getPostBySlug } from "#/lib/posts/posts.functions";
import { postRepository } from "#/lib/posts/repository";
import { type PostSummary, type TocItem } from "#/lib/posts/types";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import { createPageHead, generatedPostOgImageUrl, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({
    params,
  }): Promise<{
    post: PostSummary;
    relatedPosts: readonly PostSummary[];
    toc: readonly TocItem[];
  }> => {
    const post = await getPostBySlug({ data: { slug: params.slug } });
    if (!post) throw notFound();

    // 本文チャンクをここで解決しておく。サーバーではこの await が効くので
    // 描画は同期で済み、prerender した HTML に本文がそのまま載る。
    const article = await loadArticle(params.slug);

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

    return { post, relatedPosts, toc: article?.toc ?? [] };
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
  const { post, relatedPosts, toc } = Route.useLoaderData();

  const category = categoryBySlug(post.category);
  const readingMinutes = post.readingMinutes;

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
            <li key={tag}>
              <RouterLink
                className="relative inline-flex min-h-12 min-w-12 items-center justify-center rounded-full px-3 text-[0.8rem] text-muted no-underline transition-colors before:pointer-events-none before:absolute before:inset-x-0 before:inset-y-[10px] before:rounded-full before:border before:border-line before:content-[''] hover:text-ink hover:before:border-accent-border focus-visible:before:border-accent-border"
                to="/tags/$tag"
                params={{ tag }}
              >
                {tag}
              </RouterLink>
            </li>
          ))}
        </ul>
      </header>

      <PostBody key={post.slug} post={post} tocItems={toc} />
      <ArticleFooter post={post} relatedPosts={relatedPosts} />
    </article>
  );
}

function PostBody({ post, tocItems }: { post: PostSummary; tocItems: readonly TocItem[] }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const toc = useToc(contentRef, tocItems);

  if (!toc.hasToc) return <MarkdownContent containerRef={contentRef} post={post} />;

  return (
    <>
      {/* 1000px未満は固定ボタンからシート、デスクトップは右サイド。見出し追従は共有し、
          開閉状態はデスクトップの保存状態とモバイルの一時状態を分ける。 */}
      <div className="toc toc-mobile">
        <MobileTableOfContents toc={toc} />
      </div>
      <div
        className={`post-layout post-layout--has-toc${toc.isDesktopOpen ? "" : " post-layout--toc-closed"}`}
      >
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

type ArticleModule = {
  default: (props: { components?: typeof articleComponents }) => React.JSX.Element;
  toc: readonly TocItem[];
};

// eager に読むと全記事が 1 チャンクに固まり、1 本開くだけで他の記事の本文まで
// 運ぶことになる。slug ごとに分けたうえで、loader 側で await して SSR に間に合わせる。
const articleImporters = import.meta.glob<ArticleModule>("../../content/posts/*/index.mdx");

// use() に毎回別の Promise を渡すと解決し直しになるので、Promise ごと覚える。
const articlePromises = new Map<string, Promise<ArticleModule | undefined>>();

function loadArticle(slug: string): Promise<ArticleModule | undefined> {
  const cached = articlePromises.get(slug);
  if (cached) return cached;

  const importer = articleImporters[`../../content/posts/${slug}/index.mdx`];
  const promise = importer ? importer() : Promise.resolve(undefined);
  articlePromises.set(slug, promise);
  return promise;
}

function ArticleBody({ slug }: { slug: string }) {
  const Body = use(loadArticle(slug))?.default;
  return Body ? <Body components={articleComponents} /> : null;
}

function MarkdownContent({
  containerRef,
  post,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  post: PostSummary;
}) {
  return (
    <div className="markdown-content" ref={containerRef}>
      <Article>
        {/* サーバーでは loader が解決済みなので中断せず、prerender の HTML は
            本文入りで出る。境界が要るのは、その HTML を hydrate する初回だけ。 */}
        <Suspense fallback={null}>
          <ArticleBody slug={post.slug} />
        </Suspense>
      </Article>
    </div>
  );
}
