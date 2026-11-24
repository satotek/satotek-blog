import type { PostSummary } from "#/core/posts/types";
import { useEffect, useState, type ComponentProps } from "react";

import { HomeSidebar } from "#/components/HomeSidebar";
import { useMusicSnapshot } from "#/components/listening";

type Props = {
  posts: readonly PostSummary[];
  categories: ComponentProps<typeof HomeSidebar>["categories"];
  tags: ComponentProps<typeof HomeSidebar>["tags"];
};

/** 人気記事と再生中の曲は表示後に API から足す。ホームで JS が要るのはこの欄だけ。 */
export default function HomeSidebarIsland({ posts, categories, tags }: Props) {
  const listening = useMusicSnapshot();
  const [popularSlugs, setPopularSlugs] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/posts/popular")
      .then(async (response) => {
        if (!response.ok) return [];
        const body = (await response.json()) as { posts?: readonly { slug?: string }[] };
        return (body.posts ?? []).flatMap((post) => (post.slug ? [post.slug] : []));
      })
      .then((slugs) => {
        if (!cancelled) setPopularSlugs(slugs);
      })
      .catch(() => {
        if (!cancelled) setPopularSlugs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const highlights = popularSlugs.flatMap((slug) => {
    const post = posts.find((candidate) => candidate.slug === slug);
    return post ? [post] : [];
  });

  return (
    <HomeSidebar
      highlights={highlights}
      listening={listening.snapshot}
      categories={categories}
      tags={tags}
    />
  );
}
