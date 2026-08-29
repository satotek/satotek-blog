import { ExternalLink, FileText } from "lucide-react";

import { DeferredShareButton } from "#/components/DeferredShareButton";
import { PostList } from "#/components/PostList";
import { Link as AriaLink } from "#/components/ui";
import type { Post, PostSummary } from "#/content/types";
import { postSourceUrl, SITE_URL } from "#/lib/site";

const actionLinkClass =
  "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.85rem] text-muted no-underline transition-[background,border-color,color,transform] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-ink active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

export function ArticleFooter({
  post,
  relatedPosts,
}: {
  post: Post;
  relatedPosts: readonly PostSummary[];
}) {
  const postUrl = `${SITE_URL}/posts/${post.slug}`;

  return (
    <footer className="mt-16">
      <section className="border-y border-line py-8" aria-labelledby="article-footer-title">
        <h2 className="sr-only" id="article-footer-title">
          記事の補足情報
        </h2>

        <div>
          <p className="m-0 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
            Article tools
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeferredShareButton title={post.title} url={postUrl} />
            <AriaLink
              className={actionLinkClass}
              href={postSourceUrl(post.slug)}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              Markdown
              <ExternalLink className="size-3" aria-hidden="true" />
            </AriaLink>
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 ? (
        <section className="mt-12" aria-labelledby="related-posts-title">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="m-0 text-[1rem] font-bold" id="related-posts-title">
              関連記事
            </h2>
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
              Related posts
            </span>
          </div>
          <PostList posts={relatedPosts} variant="grid" />
        </section>
      ) : null}
    </footer>
  );
}
