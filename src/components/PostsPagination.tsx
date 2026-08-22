import { Link } from "@tanstack/react-router";

export function PostsPagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-5 border-t border-line py-5 text-[0.85rem]"
      aria-label="ページ送り"
    >
      {current > 1 ? (
        <Link
          className="text-accent no-underline hover:underline"
          to="/posts/page/$page"
          params={{ page: String(current - 1) }}
        >
          ← 前へ
        </Link>
      ) : (
        <span className="text-muted/45">← 前へ</span>
      )}
      <ol className="m-0 flex list-none items-center gap-1.5 p-0">
        {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
          <li key={page}>
            {page === current ? (
              <span
                className="inline-flex min-w-8 items-center justify-center rounded-full bg-accent-soft px-2 py-1 text-accent"
                aria-current="page"
              >
                {page}
              </span>
            ) : page === 1 ? (
              <Link
                className="inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-accent no-underline hover:bg-accent-soft"
                to="/posts"
              >
                {page}
              </Link>
            ) : (
              <Link
                className="inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-accent no-underline hover:bg-accent-soft"
                to="/posts/page/$page"
                params={{ page: String(page) }}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {current < total ? (
        <Link
          className="text-accent no-underline hover:underline"
          to="/posts/page/$page"
          params={{ page: String(current + 1) }}
        >
          次へ →
        </Link>
      ) : (
        <span className="text-muted/45">次へ →</span>
      )}
    </nav>
  );
}
