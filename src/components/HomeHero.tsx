import { ArrowUpRight } from "lucide-react";

import { ResponsiveImage } from "#/components/ResponsiveImage";
import { RouterLink } from "#/components/ui";
import { mediaUrl } from "#/lib/site";

export function HomeHero({ total, topics }: { total: number; topics: number }) {
  return (
    <section className="flex items-start gap-5 pt-6 sm:gap-6" aria-labelledby="home-title">
      <ResponsiveImage
        className="size-14 shrink-0 rounded-full border border-line object-cover sm:size-16"
        src={mediaUrl("site/my-avater.jpg")}
        sizes="64px"
        alt=""
        width="128"
        height="128"
      />
      <div className="min-w-0">
        <h1
          className="m-0 text-[clamp(1.75rem,6vw,2.3rem)] font-bold leading-[1.25] tracking-[-0.05em]"
          id="home-title"
        >
          Hi, I&apos;m satotek.
        </h1>
        <p className="m-0 mt-2.5 max-w-[640px] text-[0.98rem] leading-[1.8] text-muted">
          技術と日常を、すこしずつ記録しています。旅行、技術、ガジェット、読書記録などの記事を気ままに書いています。
        </p>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <RouterLink
            className="inline-flex items-center gap-1.5 text-[0.88rem] font-semibold text-accent no-underline transition-[gap] duration-200 hover:gap-2.5 motion-reduce:transition-none"
            to="/profile"
          >
            プロフィール
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </RouterLink>
          <span className="font-mono text-[0.72rem] uppercase tracking-[0.06em] text-muted">
            {total} posts · {topics} topics
          </span>
        </div>
      </div>
    </section>
  );
}
