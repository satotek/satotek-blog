import { createFileRoute, Link } from "@tanstack/react-router";

import { getTags } from "#/data/navigation";
import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/tags/")({
  head: () => ({
    meta: [
      { title: "タグ | satotek.dev" },
      { name: "description", content: "タグ一覧" },
      ...createSocialMeta({
        title: "タグ | satotek.dev",
        description: "タグ一覧",
        url: `${SITE_URL}/tags`,
      }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/tags` }],
  }),
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
