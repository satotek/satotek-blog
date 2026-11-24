import { Suspense, use, type ReactElement } from "react";

import { Article, articleComponents } from "#/components/article/Article";
import { ArticleFooter } from "#/components/ArticleFooter";
import { RouterLink } from "#/components/ui";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import ArticleToc from "../../src/islands/ArticleToc";
import PostViews from "../../src/islands/PostViews";
import type { Props } from "./[slug].server";

type ArticleModule = {
  default: (props: { components?: typeof articleComponents }) => ReactElement;
};

const ssrArticles = import.meta.env.SSR
  ? import.meta.glob<ArticleModule>("../../src/content/posts/*/index.mdx", { eager: true })
  : undefined;

const clientArticleLoaders = !import.meta.env.SSR
  ? import.meta.glob<ArticleModule>("../../src/content/posts/*/index.mdx")
  : undefined;

const articleCache = new Map<string, ArticleModule>();
const articlePromises = new Map<string, Promise<ArticleModule | undefined>>();

function articlePath(slug: string) {
  return `../../src/content/posts/${slug}/index.mdx`;
}

function loadClientArticle(slug: string): Promise<ArticleModule | undefined> {
  const cached = articlePromises.get(slug);
  if (cached) return cached;
  const loader = clientArticleLoaders?.[articlePath(slug)];
  if (!loader) return Promise.resolve(undefined);
  const promise = loader().then((mod) => {
    articleCache.set(slug, mod);
    return mod;
  });
  articlePromises.set(slug, promise);
  return promise;
}

// 初回アクセス時は hydrateRoot より前に当該記事 1 本だけ先読みし、
// SSR 済み HTML とのハイドレーションで Suspense fallback へ戻らないようにする。
if (!import.meta.env.SSR && typeof window !== "undefined") {
  const match = window.location.pathname.match(/^\/posts\/([^/]+?)(?:\.html)?$/);
  if (match) {
    try {
      await loadClientArticle(decodeURIComponent(match[1]));
    } catch {
      // 読み込み失敗時は再描画時の Suspense 境界に任せる。
    }
  }
}

function LazyArticleBody({ slug }: { slug: string }) {
  const module = use(loadClientArticle(slug));
  const Body = module?.default;
  return Body ? <Body components={articleComponents} /> : null;
}

function ArticleBody({ slug }: { slug: string }) {
  const module = import.meta.env.SSR ? ssrArticles?.[articlePath(slug)] : articleCache.get(slug);
  if (module) {
    const Body = module.default;
    return <Body components={articleComponents} />;
  }
  if (import.meta.env.SSR) return null;
  return (
    <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
      <LazyArticleBody slug={slug} />
    </Suspense>
  );
}

export default function PostPage({ post, relatedPosts, toc }: Props) {
  const category = categoryBySlug(post.category);
  // useToc と同じく、見出しが3つ未満なら目次を出さない。
  const hasToc = toc.length >= 3;
  const body = (
    <div className="markdown-content" id="post-body">
      <Article>
        <ArticleBody slug={post.slug} />
      </Article>
    </div>
  );

  return (
    // クライアント遷移で別の記事へ移ったとき、目次シートやライトボックス等の記事内状態を持ち越さない。
    <article className="w-full" key={post.slug}>
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
            約{post.readingMinutes}分で読めます
          </span>
          {/* 閲覧数は GA4 から都度読むので、静的 HTML には載せずブラウザで取りに行く。 */}
          <PostViews slug={post.slug} />
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

      {hasToc ? (
        <>
          {/* 1000px未満は固定ボタンからシート、デスクトップは右サイド。 */}
          <div className="toc toc-mobile">
            <ArticleToc items={toc} variant="mobile" />
          </div>
          <div className="post-layout post-layout--has-toc">
            <div className="post-content">{body}</div>
            <aside className="toc toc-desktop">
              <ArticleToc items={toc} variant="desktop" />
            </aside>
          </div>
        </>
      ) : (
        body
      )}

      <ArticleFooter post={post} relatedPosts={relatedPosts} />
    </article>
  );
}
