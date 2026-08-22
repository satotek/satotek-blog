import { createFileRoute, Link } from "@tanstack/react-router";

import { getCategories } from "#/data/navigation";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/categories/")({
  head: () =>
    createPageHead({
      title: withSiteName("カテゴリ"),
      description: "カテゴリ一覧",
      path: "/categories",
    }),
  loader: async () => ({ categories: await getCategories() }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories } = Route.useLoaderData();

  return (
    <section>
      <h1 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        カテゴリ
      </h1>
      <ul className="m-0 grid list-none gap-2 p-0">
        {categories.map(({ slug, name, count }) => (
          <li
            className="flex items-center justify-between gap-3 rounded-site border border-line px-5 py-3.5 transition-[background,border-color] duration-150 hover:bg-card"
            key={slug}
          >
            <Link className="font-semibold no-underline" to="/categories/$slug" params={{ slug }}>
              {name}
            </Link>
            <span className="text-[0.85rem] tabular-nums text-muted">{count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
