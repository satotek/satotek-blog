import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { postRepository } from "#/content/repository";
import { SITE_URL, createSocialMeta } from "#/lib/site";

export const Route = createFileRoute("/tags/$tag")({
  head: ({ params }) => {
    const tag = decodeURIComponent(params.tag);

    return {
      meta: [
        { title: `タグ: ${tag} | satotek.dev` },
        { name: "description", content: `「${tag}」の記事一覧` },
        ...createSocialMeta({
          title: `タグ: ${tag} | satotek.dev`,
          description: `「${tag}」の記事一覧`,
          url: `${SITE_URL}/tags/${encodeURIComponent(tag)}`,
        }),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/tags/${encodeURIComponent(tag)}` }],
    };
  },
  loader: async ({ params }) => {
    const tag = decodeURIComponent(params.tag);
    const posts = await postRepository.list({ tag });
    if (posts.length === 0) throw notFound();
    return { posts };
  },
  component: TagLayout,
});

function TagLayout() {
  return <Outlet />;
}
