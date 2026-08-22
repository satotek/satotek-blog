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
export interface PostSummaryRepository {
  list(options?: PostListOptions): Promise<readonly PostSummary[]>;
}

export interface PostRepository extends PostSummaryRepository {
  listAll(): Promise<readonly Post[]>;
  findBySlug(slug: string): Promise<Post | undefined>;
}

const READING_CHARS_PER_MIN = 600;

export function getPostReadingMinutes(post: Post) {
  const text = post.content.html
    .replace(/<pre[\s\S]*?<\/pre>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/gi, "")
    .replace(/\s+/g, "");
  return Math.max(1, Math.ceil([...text].length / READING_CHARS_PER_MIN));
}
