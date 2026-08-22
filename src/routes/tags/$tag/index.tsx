import { createFileRoute } from "@tanstack/react-router";

import { TagPageContent } from "#/components/TaxonomyPage";

export const Route = createFileRoute("/tags/$tag/")({
  component: TagIndexPage,
});

function TagIndexPage() {
  const { tag: encodedTag } = Route.useParams();
  return <TagPageContent tag={decodeURIComponent(encodedTag)} page={1} />;
}
