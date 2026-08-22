export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export type PostContent = {
  format: "markdown";
  markdown: string;
  html: string;
  toc: readonly TocItem[];
};

export type PostSummary = {
  slug: string;
  title: string;
  date: string;
  category: string;
  description: string;
  tags: readonly string[];
  cover?: string;
};

export type Post = PostSummary & {
  content: PostContent;
};

export type PostListOptions = {
  category?: string;
  tag?: string;
};

/**
 * The UI talks to this boundary instead of importing a concrete content
 * source. The local adapter is synchronous in spirit but exposes an async
 * API so a Markdown or headless-CMS adapter can be introduced later without
 * changing route components.
 */
export interface PostRepository {
  list(options?: PostListOptions): Promise<readonly PostSummary[]>;
  listAll(): Promise<readonly Post[]>;
  findBySlug(slug: string): Promise<Post | undefined>;
}

export function getPostSourceText(post: Post) {
  return post.content.markdown;
}
