import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { CodeCopyButtons, ImageLightbox } from "#/components/ArticleEnhancers";
import { ArticleFooter } from "#/components/ArticleFooter";
import { TableOfContents } from "#/components/TableOfContents";
import { RouterLink } from "#/components/ui";
import { getPostBySlug } from "#/content/posts.functions";
import { postRepository } from "#/content/repository";
import { getPostReadingMinutes, type Post, type PostSummary, type TocItem } from "#/content/types";
import { categoryBySlug } from "#/data/navigation";
import { formatDate } from "#/lib/date";
import { createPageHead, generatedPostOgImageUrl, withSiteName } from "#/lib/site";

const TOC_MIN = 3;
const TOC_STATE_KEY = "toc-state";
const READING_LINE = 120;

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
  const hasToc = post.content.toc.length >= TOC_MIN;
  const activeId = useActiveHeading(contentRef, hasToc ? post.content.toc : []);
  const [tocOpen, setTocOpen] = useState(true);

  useEffect(() => {
    try {
      setTocOpen(localStorage.getItem(TOC_STATE_KEY) !== "close");
    } catch {}
  }, []);

  const toggleToc = () => {
    setTocOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(TOC_STATE_KEY, next ? "open" : "close");
      } catch {}
      return next;
    });
  };

  return (
    <>
      {hasToc ? (
        <>
          <div className="toc toc-mobile">
            <TableOfContents
              activeId={activeId}
              isOpen={tocOpen}
              items={post.content.toc}
              onToggle={toggleToc}
            />
          </div>
          <div className={`post-layout${tocOpen ? "" : " post-layout--toc-closed"}`}>
            <div className="post-content">
              <MarkdownContent containerRef={contentRef} post={post} />
            </div>
            <aside className="toc toc-desktop">
              <TableOfContents
                activeId={activeId}
                isOpen={tocOpen}
                items={post.content.toc}
                onToggle={toggleToc}
              />
            </aside>
          </div>
        </>
      ) : (
        <>
          <MarkdownContent containerRef={contentRef} post={post} />
        </>
      )}
    </>
  );
}

function MarkdownContent({
  containerRef,
  post,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  post: Post;
}) {
  return (
    <>
      <div className="markdown-content">
        <div
          ref={containerRef}
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: post.content.html }}
        />
        <CodeCopyButtons containerRef={containerRef} contentKey={post.slug} />
        <ImageLightbox containerRef={containerRef} contentKey={post.slug} />
      </div>
    </>
  );
}

function useActiveHeading(
  contentRef: React.RefObject<HTMLDivElement | null>,
  items: readonly TocItem[],
) {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    setActiveId(items[0]?.id);
    if (items.length === 0) return;

    // 記事本文は再レンダリングで DOM ごと差し替わることがある。見出しの参照を
    // 持ち回ると detached なノードを測り続けて追従が止まるので、毎回引き直す。
    const readHeadings = () => {
      const root = contentRef.current;
      if (!root) return [];
      return items
        .map((item) => root.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`))
        .filter((heading): heading is HTMLElement => heading !== null);
    };

    // 「読んでいる行」を固定ヘッダーの少し下に置き、そこを最後に通過した見出しを
    // 採用する。帯に見出しが無い時間があっても答えが必ず出る。
    const update = () => {
      const headings = readHeadings();
      if (headings.length === 0) return;

      const reachedBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (reachedBottom) {
        setActiveId(headings.at(-1)?.id);
        return;
      }

      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > READING_LINE) break;
        current = heading;
      }
      setActiveId(current?.id);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [contentRef, items]);

  return activeId;
}
