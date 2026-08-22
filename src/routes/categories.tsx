import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [{ title: "カテゴリ | satotek.dev" }, { name: "description", content: "カテゴリ一覧" }],
    links: [{ rel: "canonical", href: "https://satotek.dev/categories" }],
  }),
  component: CategoriesLayout,
});

function CategoriesLayout() {
  return <Outlet />;
}
