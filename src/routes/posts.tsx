import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts")({
  component: PostsLayout,
});

function PostsLayout() {
  return <Outlet />;
}
