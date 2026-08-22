import { createFileRoute, Link } from "@tanstack/react-router";

import { getTags } from "#/data/navigation";

export const Route = createFileRoute("/tags/")({
  component: TagsPage,
});

function TagsPage() {
  const tags = getTags();

  return (
    <section>
      <h1 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        タグ
      </h1>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {tags.map(({ name, count }) => (
          <li key={name}>
            <Link
              className="inline-flex items-baseline gap-[7px] rounded-full border border-line px-3.5 py-1.5 text-[0.9rem] font-semibold no-underline transition-[background,border-color] duration-150 hover:border-accent-border hover:bg-card"
              to="/tags/$tag"
              params={{ tag: name }}
            >
              <span>#{name}</span>
              <span className="text-[0.8rem] font-normal tabular-nums text-muted">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
