import { CategoryPageContent } from "#/components/TaxonomyPage";
import type { Props } from "./index.server";

export default function CategoryPage({ slug, posts, filters }: Props) {
  return <CategoryPageContent slug={slug} page={1} posts={posts} filters={filters} />;
}
