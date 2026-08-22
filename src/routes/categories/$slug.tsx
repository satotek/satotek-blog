import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { categoryBySlug } from "#/data/navigation";

export const Route = createFileRoute("/categories/$slug")({
  loader: ({ params }) => {
    if (!categoryBySlug(params.slug)) throw notFound();
    return null;
  },
  component: CategoryLayout,
});

function CategoryLayout() {
  return <Outlet />;
}
