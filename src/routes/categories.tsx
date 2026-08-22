import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "カテゴリ | satotek.dev" },
      { name: "description", content: "カテゴリ一覧" },
      ...createSocialMeta({
        title: "カテゴリ | satotek.dev",
        description: "カテゴリ一覧",
        url: `${SITE_URL}/categories`,
      }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/categories` }],
  }),
  component: CategoriesLayout,
});

function CategoriesLayout() {
  return <Outlet />;
}
