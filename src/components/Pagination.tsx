import type { ReactNode } from "react";

const NUMBER_CLASS =
  "inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-accent no-underline hover:bg-accent-soft";
const EDGE_CLASS = "text-accent no-underline hover:underline";
const DISABLED_CLASS = "text-muted/45";

export type PageLinkProps = { page: number; className: string; children: ReactNode };

/**
 * ページ番号からリンクを作る部品。リンク先はルートごとに違うので呼び出し側が渡す。
 * TanStack Router の `to` は型付きリテラルなので、文字列を受け渡すより
 * コンポーネントごと注入したほうが型安全になる。
 */
export type PageLinkComponent = (props: PageLinkProps) => ReactNode;

export function Pagination({
  current,
  total,
  PageLink,
  className = "",
}: {
  current: number;
  total: number;
  PageLink: PageLinkComponent;
  className?: string;
}) {
  if (total <= 1) return null;

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-5 border-t border-line py-5 text-[0.85rem] ${className}`}
      aria-label="ページ送り"
    >
      {current > 1 ? (
        <PageLink page={current - 1} className={EDGE_CLASS}>
          ← 前へ
        </PageLink>
      ) : (
        <span className={DISABLED_CLASS}>← 前へ</span>
      )}
      <ol className="m-0 flex list-none items-center gap-1.5 p-0">
        {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            {page === current ? (
              <span className={`${NUMBER_CLASS} bg-accent-soft`} aria-current="page">
                {page}
              </span>
            ) : (
              <PageLink page={page} className={NUMBER_CLASS}>
                {page}
              </PageLink>
            )}
          </li>
        ))}
      </ol>
      {current < total ? (
        <PageLink page={current + 1} className={EDGE_CLASS}>
          次へ →
        </PageLink>
      ) : (
        <span className={DISABLED_CLASS}>次へ →</span>
      )}
    </nav>
  );
}
