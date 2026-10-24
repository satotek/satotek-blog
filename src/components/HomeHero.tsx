import { ArrowUpRight } from "lucide-react";

import { ResponsiveImage } from "#/components/ResponsiveImage";
import { RouterLink } from "#/components/ui";
import { mediaUrl } from "#/lib/site";

/**
 * ホーム冒頭の自己紹介。スマホではアバターと名前を1行に並べ、紹介文は全幅で読ませる。
 * デスクトップではアバターを左の列に置き、右の列に名前・紹介文・リンクを積む。
 */
export function HomeHero({ total, topics }: { total: number; topics: number }) {
  return (
    <section
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 pt-6 sm:gap-x-6"
      aria-labelledby="home-title"
    >
      <ResponsiveImage
        pictureClassName="shrink-0 sm:row-span-3 sm:self-start"
        className="size-14 shrink-0 rounded-full border border-line object-cover sm:size-[72px]"
        src={mediaUrl("site/my-avater.jpg")}
        sizes="72px"
        alt=""
        width="144"
        height="144"
      />
      <h1
        className="m-0 text-[clamp(1.75rem,6vw,2.3rem)] font-bold leading-[1.25] tracking-[-0.05em]"
        id="home-title"
      >
        Hi, I&apos;m satotek.
      </h1>
      <p className="col-span-2 m-0 mt-4 max-w-[640px] text-[0.98rem] leading-[1.8] text-muted sm:col-span-1 sm:mt-2">
        技術と日常を、すこしずつ記録しています。旅行やガジェット、読書の記録も気ままに書いています。
      </p>
      <div className="col-span-2 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-1 sm:mt-3.5">
        <RouterLink className="hero-chip group" to="/profile">
          Profile
          <ArrowUpRight
            className="size-3.5 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none"
            aria-hidden="true"
          />
        </RouterLink>
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.06em] text-muted">
          {total} posts · {topics} topics
        </span>
      </div>
    </section>
  );
}
