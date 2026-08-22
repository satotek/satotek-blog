import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/categories")({
  component: CategoriesLayout,
});

function CategoriesLayout() {
  return <Outlet />;
}
