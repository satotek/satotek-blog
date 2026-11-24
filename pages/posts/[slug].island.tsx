import type { TocItem } from "#/core/posts/types";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";

import { Article, articleComponents } from "#/components/article/Article";
import { ArticleFooter } from "#/components/ArticleFooter";
import { RouterLink } from "#/components/ui";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import { SITE_URL } from "#/lib/site";
import ArticleImage from "../../src/islands/ArticleImage" with { island: "visible" };
import ArticleToc from "../../src/islands/ArticleToc" with { island: "load" };
import CopyCodeButton from "../../src/islands/CopyCodeButton" with { island: "visible" };
import PostViews from "../../src/islands/PostViews" with { island: "idle" };
import ShareButton from "../../src/islands/ShareButton" with { island: "idle" };
import type { Props } from "./[slug].server";

type ArticleModule = {
  default: (props: { components?: typeof articleComponents }) => ReactElement;
  toc: readonly TocItem[];
};

// island ページのコンポーネントはサーバーでしか動かず、ブラウザへは送られない。
// そのため eager に全記事を読んでも、クライアントのチャンクは膨らまない。
const articles = import.meta.glob<ArticleModule>("../../src/content/posts/*/index.mdx", {
  eager: true,
});

/**
 * 共有の CodeBlock はコピー状態を自前で持つので、island ページでは死んだボタンになる。
 * 枠と <pre> は静的に描き、ボタンだけを island として差し込む。
 * island の import 属性は page / layout ファイルでしか拾われないため、ここで定義する。
 */
function CodeBlock({
  children,
  ...props
}: HTMLAttributes<HTMLPreElement> & { "data-title"?: string }) {
  const filename = props["data-title"];
  return (
    <div className={`code-block${filename ? "" : " code-block--untitled"}`}>
      {filename ? (
        <div className="code-block__bar">
          <span className="code-block__meta">
            <span className="code-block__filename">
              <span aria-hidden="true" className="code-block__icon">
                ▸
              </span>
              {filename}
            </span>
          </span>
          <CopyCodeButton />
        </div>
      ) : (
        <div className="code-block__actions">
          <CopyCodeButton />
        </div>
      )}
      <pre {...props}>{children}</pre>
    </div>
  );
}

// island の import は JSX として使われた箇所だけが差し替わるので、components マップへ直接は渡せない。
function Image(props: ComponentProps<typeof ArticleImage>) {
  return <ArticleImage {...props} />;
}

const components = { ...articleComponents, pre: CodeBlock, img: Image };

export default function PostPage({ post, relatedPosts }: Props) {
  const article = articles[`../../src/content/posts/${post.slug}/index.mdx`];
  const Body = article?.default;
  const category = categoryBySlug(post.category);
  const toc = article?.toc ?? [];
  // useToc と同じく、見出しが3つ未満なら目次を出さない。
  const hasToc = toc.length >= 3;
  const body = (
    <div className="markdown-content" id="post-body">
      <Article>{Body ? <Body components={components} /> : null}</Article>
    </div>
  );

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

      <ArticleFooter
        post={post}
        relatedPosts={relatedPosts}
        share={<ShareButton title={post.title} url={`${SITE_URL}/posts/${post.slug}`} />}
      />
    </article>
  );
}
