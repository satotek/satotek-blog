import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "記事一覧 | satotek.dev" },
      { name: "description", content: "satotek.devの記事一覧" },
      ...createSocialMeta({
        title: "記事一覧 | satotek.dev",
        description: "satotek.devの記事一覧",
        url: `${SITE_URL}/posts`,
        includeImageDimensions: false,
      }),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/posts` }],
  }),
  component: PostsLayout,
});

function PostsLayout() {
  return <Outlet />;
}
