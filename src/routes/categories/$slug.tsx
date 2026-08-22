import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { categoryBySlug } from "#/data/navigation";
import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => {
    const category = categoryBySlug(params.slug);
    const name = category?.name ?? "カテゴリ";

    return {
      meta: [
        { title: `カテゴリ: ${name} | satotek.dev` },
        { name: "description", content: `「${name}」の記事一覧` },
        ...createSocialMeta({
          title: `カテゴリ: ${name} | satotek.dev`,
          description: `「${name}」の記事一覧`,
          url: `${SITE_URL}/categories/${params.slug}`,
        }),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/categories/${params.slug}` }],
    };
  },
  loader: ({ params }) => {
    if (!categoryBySlug(params.slug)) throw notFound();
    return null;
  },
  component: CategoryLayout,
});

function CategoryLayout() {
  return <Outlet />;
}
