import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { posts } from "#/data/posts";
import { SITE_URL } from "#/lib/site";

export const Route = createFileRoute("/tags/$tag")({
  head: ({ params }) => {
    const tag = decodeURIComponent(params.tag);

    return {
      meta: [
        { title: `タグ: ${tag} | satotek.dev` },
        { name: "description", content: `「${tag}」の記事一覧` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/tags/${encodeURIComponent(tag)}` }],
    };
  },
  loader: ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    if (!posts.some((post) => post.tags.includes(tag))) throw notFound();
    return null;
  },
  component: TagLayout,
});

function TagLayout() {
  return <Outlet />;
}
