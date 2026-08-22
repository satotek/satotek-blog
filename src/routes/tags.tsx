import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/tags")({
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
  component: TagsLayout,
});

function TagsLayout() {
  return <Outlet />;
}
