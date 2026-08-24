import { createFileRoute } from "@tanstack/react-router";

import { RouterLink } from "#/components/ui";
import { getTags } from "#/data/navigation";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/tags/")({
  head: () =>
    createPageHead({ title: withSiteName("タグ"), description: "タグ一覧", path: "/tags" }),
  loader: async () => ({ tags: await getTags() }),
  component: TagsPage,
});

function TagsPage() {
  const { tags } = Route.useLoaderData();

  return (
    <section>
      <h1 className="mb-5 text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-muted">
        タグ
      </h1>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {tags.map(({ name, count }) => (
          <li key={name}>
            <RouterLink
              className="inline-flex items-baseline gap-[7px] rounded-full border border-line px-3.5 py-1.5 text-[0.9rem] font-semibold no-underline transition-[background,border-color] duration-150 hover:border-accent-border hover:bg-card"
              to="/tags/$tag"
              params={{ tag: name }}
            >
              <span>#{name}</span>
              <span className="text-[0.8rem] font-normal tabular-nums text-muted">{count}</span>
            </RouterLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
