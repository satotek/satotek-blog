import { HomeHero } from "#/components/HomeHero";
import { PostList } from "#/components/PostList";
import { RouterLink } from "#/components/ui";
import HomeSidebar from "../src/islands/HomeSidebar" with { island: "visible" };
import type { Props } from "./index.server";

export default function HomePage({ posts, categories, tags }: Props) {
  const latest = posts.slice(0, 5);

  return (
    <div>
      <HomeHero total={posts.length} topics={categories.length} />

      <div className="mt-9 grid grid-cols-1 items-start gap-[clamp(2rem,4vw,3rem)] sm:grid-cols-[minmax(0,1fr)_296px]">
        <section aria-labelledby="latest-title">
          <div className="mb-3.5 flex items-baseline justify-between gap-4">
            <h2 className="m-0 text-[1rem] font-bold tracking-[-0.01em]" id="latest-title">
              最新の記事
            </h2>
            <RouterLink
              className="inline-flex min-h-6 items-center text-[0.85rem] font-semibold text-accent no-underline hover:underline"
              to="/posts"
            >
              記事一覧 →
            </RouterLink>
          </div>
          {latest.length > 0 ? (
            <PostList posts={latest} variant="panel" enter mobileLimit={4} />
          ) : (
            <p className="text-muted">公開中の記事はありません。</p>
          )}
        </section>

        <HomeSidebar posts={posts} categories={categories} tags={tags} />
      </div>
    </div>
  );
}
