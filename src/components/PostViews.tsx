import { useEffect, useState } from "react";
import { fetch } from "void/client";

/**
 * 記事の累計閲覧数。数は GA4 から API Worker が読むので、prerender した HTML には
 * 載らない。取れなかったときは何も出さず、見出しまわりを崩さない。
 */
export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setViews(null);

    void fetch("/api/posts/[slug]/views", { params: { slug } })
      .then((body) => {
        if (!cancelled) {
          setViews(typeof body.views === "number" && body.views > 0 ? body.views : null);
        }
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
