import type { ReactNode } from "react";

import { BlockPuzzle } from "#/components/games/BlockPuzzle";

export function NotFound({
  code = "404",
  title,
  description,
  children,
}: {
  code?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[820px] px-4 pb-12 pt-2 text-center sm:px-6">
      <p className="m-0 mt-2 text-[clamp(64px,18vw,120px)] leading-none tracking-[0.02em] text-accent">
        {code}
      </p>
      <p className="m-0 mt-2 text-[1.1rem]">{title}</p>
      {description ? <p className="mb-6 mt-1.5 text-muted">{description}</p> : null}
      {children}
    </section>
  );
}

/** 404.tsx（静的404.html）と _not-found.tsx（動的/SPAの404境界）で共有する 404 画面。 */
export function NotFoundContent() {
  return (
    <NotFound
      title="ページが見つかりません。"
      description="せっかくなので、ブロックパズルでもどうぞ。"
    >
      <a className="text-accent underline underline-offset-2" href="/">
        ← Homeへ戻る
      </a>
      <div className="mt-8">
        <BlockPuzzle />
      </div>
    </NotFound>
  );
}
