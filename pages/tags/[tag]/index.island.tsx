import { TagPageContent } from "#/components/TaxonomyPage";
import type { Props } from "./index.server";

export default function TagPage({ tag, posts, filters }: Props) {
  return <TagPageContent tag={tag} page={1} posts={posts} filters={filters} />;
}
