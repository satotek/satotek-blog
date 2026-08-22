import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tags")({
  head: () => ({
    meta: [{ title: "タグ | satotek.dev" }, { name: "description", content: "タグ一覧" }],
    links: [{ rel: "canonical", href: "https://satotek.dev/tags" }],
  }),
  component: TagsLayout,
});

function TagsLayout() {
  return <Outlet />;
}
