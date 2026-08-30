import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { postRepository } from "#/lib/posts/repository";

export const Route = createFileRoute("/tags/$tag")({
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
