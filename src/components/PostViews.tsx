import { useEffect, useState } from "react";

/**
 * 記事の累計閲覧数。数は GA4 から API Worker が読むので、prerender した HTML には
 * 載らない。取れなかったときは何も出さず、見出しまわりを崩さない。
 */
export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setViews(null);

    void fetch(`/api/posts/${encodeURIComponent(slug)}/views`)
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { views?: unknown };
        return typeof body.views === "number" && body.views > 0 ? body.views : null;
      })
      .then((count) => {
        if (!cancelled) setViews(count);
      })
      .catch(() => {
        if (!cancelled) setViews(null);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (views === null) return null;

  return (
    <span className="text-[0.9rem] tabular-nums text-muted">
      {views.toLocaleString("ja-JP")} 回読まれています
    </span>
  );
}
