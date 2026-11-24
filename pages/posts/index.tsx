import { SectionHeading } from "#/components/SectionHeading";
import PostsBrowser from "../../src/islands/PostsBrowser";
import type { Props } from "./index.server";

export default function PostsIndexPage({ posts, filters }: Props) {
  return (
    <section>
      <SectionHeading eyebrow="Journal" title="記事一覧" description={`${posts.length}件の記事`} />
      <PostsBrowser posts={posts} filters={filters} />
    </section>
  );
}
