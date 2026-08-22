import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "記事一覧 | satotek.dev" },
      { name: "description", content: "satotek.devの記事一覧" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/posts` }],
  }),
  component: PostsLayout,
});

function PostsLayout() {
  return <Outlet />;
}
