import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { getPopularPosts } from "#/analytics/functions";
import type { PopularPost } from "#/analytics/types";
import { HomeHero } from "#/components/HomeHero";
import { HomeSidebar } from "#/components/HomeSidebar";
import { PostList } from "#/components/PostList";
import { RouterLink } from "#/components/ui";
import type { PostSummary } from "#/content/types";
import { PICKED_POST_SLUGS } from "#/data/home";
import { getCategories, getTags } from "#/data/navigation";
import { postRepository } from "#/content/repository";
import { SITE_NAME, createPageHead } from "#/lib/site";

export const Route = createFileRoute("/")({
  head: () =>
    createPageHead({
      title: SITE_NAME,
      description: "nosukeの個人ブログ。技術、ガジェット、旅行、日常についての記録。",
      path: "/",
    }),
  loader: async () => {
    const [posts, categories, tags] = await Promise.all([
      postRepository.list(),
      getCategories(),
      getTags(),
    ]);

    return {
      allPosts: posts,
      latest: posts.slice(0, 4),
      total: posts.length,
      categories,
      tags,
      pickedPosts: postsBySlug(posts, PICKED_POST_SLUGS),
    };
  },
  component: Home,
});

function Home() {
  const { allPosts, latest, total, categories, tags, pickedPosts } = Route.useLoaderData();
  const fetchPopularPosts = useServerFn(getPopularPosts);
  const [popular, setPopular] = useState<readonly PopularPost[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetchPopularPosts()
      .then((result) => {
        if (!cancelled) setPopular(result);
      })
      .catch(() => {
        // GA4は補助データ。取得できない場合はPick upをそのまま表示する。
        if (!cancelled) setPopular([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPopularPosts]);

  const popularPosts = popular.flatMap((item) => {
    const post = allPosts.find((candidate) => candidate.slug === item.slug);
    return post ? [post] : [];
  });
  const highlights = popularPosts.length > 0 ? popularPosts : pickedPosts;
  const hasPopularPosts = popularPosts.length > 0;

  return (
    <div>
      <HomeHero total={total} topics={categories.length} />

      <div className="mt-9 grid grid-cols-1 items-start gap-[clamp(2rem,4vw,3rem)] sm:grid-cols-[minmax(0,1fr)_296px]">
        <main aria-labelledby="latest-title">
          <div className="mb-3.5 flex items-baseline justify-between gap-4">
            <h2 className="m-0 text-[1rem] font-bold tracking-[-0.01em]" id="latest-title">
              最新の記事
            </h2>
            <RouterLink
              className="text-[0.85rem] font-semibold text-accent no-underline hover:underline"
              to="/posts"
            >
              記事一覧 →
            </RouterLink>
          </div>
          {latest.length > 0 ? (
            <PostList posts={latest} variant="panel" />
          ) : (
            <p className="text-muted">公開中の記事はありません。</p>
          )}
        </main>

        <HomeSidebar
          highlights={highlights}
          hasPopularPosts={hasPopularPosts}
          categories={categories}
          tags={tags}
        />
      </div>
    </div>
  );
}

function postsBySlug(posts: readonly PostSummary[], slugs: readonly string[]) {
  return slugs.flatMap((slug) => {
    const post = posts.find((candidate) => candidate.slug === slug);
    return post ? [post] : [];
  });
}
