import { RouterLink } from "#/components/ui";
import type { PostFilters as PostFiltersData } from "#/data/navigation";

type Active = { category: string } | { tag: string } | null;

const pillClass =
  "inline-flex items-baseline gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.86rem] font-semibold no-underline transition-[background,border-color,color] duration-150";
const pillIdle = "border-line text-ink hover:border-accent-border hover:bg-hover hover:text-accent";
const pillActive = "border-transparent bg-accent-soft text-accent ring-1 ring-accent-border";

const tagClass =
  "inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-[0.8rem] no-underline transition-colors duration-150";
const tagIdle = "text-muted hover:bg-hover hover:text-accent";
const tagActive = "bg-accent-soft font-semibold text-accent";

/**
 * 記事一覧・カテゴリ・タグのページ上部に置く絞り込み。
 * 専用の一覧ページを持たず、記事一覧の中でカテゴリとタグを行き来できるようにする。
 */
export function PostFilters({
  filters,
  totalPosts,
  active = null,
}: {
  filters: PostFiltersData;
  totalPosts: number;
  active?: Active;
}) {
  const activeCategory = active && "category" in active ? active.category : null;
  const activeTag = active && "tag" in active ? active.tag : null;

  return (
    <nav className="panel mb-6 grid gap-4 p-4 sm:p-5" aria-label="記事の絞り込み">
      <div className="grid gap-2">
        <h2 className="m-0 font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted">
          Category
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          <li>
            <RouterLink
              className={`${pillClass} ${active === null ? pillActive : pillIdle}`}
              to="/posts"
              aria-current={active === null ? "page" : undefined}
            >
              すべて
              <Count value={totalPosts} />
            </RouterLink>
          </li>
          {filters.categories
            .filter(({ count, slug }) => count > 0 || slug === activeCategory)
            .map(({ slug, name, count }) => {
              const isActive = slug === activeCategory;
              return (
                <li key={slug}>
                  <RouterLink
                    className={`${pillClass} ${isActive ? pillActive : pillIdle}`}
                    to="/categories/$slug"
                    params={{ slug }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {name}
                    <Count value={count} />
                  </RouterLink>
                </li>
              );
            })}
        </ul>
      </div>

      {filters.tags.length > 0 && (
        <div className="grid gap-2 border-t border-line pt-3.5">
          <h2 className="m-0 font-mono text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted">
            Tags
          </h2>
          <ul className="m-0 -mx-1 flex list-none flex-wrap gap-1 p-0">
            {filters.tags.map(({ name, count }) => {
              const isActive = name === activeTag;
              return (
                <li key={name}>
                  <RouterLink
                    className={`${tagClass} ${isActive ? tagActive : tagIdle}`}
                    to="/tags/$tag"
                    params={{ tag: name }}
                    aria-current={isActive ? "page" : undefined}
                  >
                    #{name}
                    <span className="font-mono text-[0.68rem] tabular-nums opacity-70">
                      {count}
                    </span>
                  </RouterLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="font-mono text-[0.72rem] font-normal tabular-nums opacity-75">{value}</span>
  );
}
