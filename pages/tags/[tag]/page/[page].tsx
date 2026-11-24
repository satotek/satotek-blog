import { TagPageContent } from "#/components/TaxonomyPage";
import type { Props } from "./[page].server";

export default function TagNumberedPage({ tag, page, posts, filters }: Props) {
  return <TagPageContent tag={tag} page={page} posts={posts} filters={filters} />;
}
