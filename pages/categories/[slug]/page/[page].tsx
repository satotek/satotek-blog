import { CategoryPageContent } from "#/components/TaxonomyPage";
import type { Props } from "./[page].server";

export default function CategoryNumberedPage({ slug, page, posts, filters }: Props) {
  return <CategoryPageContent slug={slug} page={page} posts={posts} filters={filters} />;
}
