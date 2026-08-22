import { createFileRoute } from "@tanstack/react-router";

import { CategoryPageContent } from "#/components/TaxonomyPage";

export const Route = createFileRoute("/categories/$slug/")({
  component: CategoryIndexPage,
});

function CategoryIndexPage() {
  const { slug } = Route.useParams();
  return <CategoryPageContent slug={slug} page={1} />;
}
