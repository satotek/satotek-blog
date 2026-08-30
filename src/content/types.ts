export type TocItem = {
  id: string;
  text: string;
  level: number;
};

// 本文と目次は MDX モジュール側が持つ。ここに残すのは、
// llms-full.txt と読了時間が必要とする原文だけ。
export type PostContent = {
  format: "mdx";
  markdown: string;
};

/** MDX モジュールが frontmatter として名前付きエクスポートする生の値。 */
export type PostFrontmatter = {
  title: string;
  date: string;
  category: string;
  draft?: boolean;
  description?: string;
  tags?: readonly string[];
  cover?: string;
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

// 数えたいのは「読み手が1文字と感じる単位」。文字列を展開するとコードポイント
// 単位になり、絵文字や結合文字が複数に割れて水増しされるため、書記素で区切る。
let graphemeSegmenter: Intl.Segmenter | undefined;

function countCharacters(text: string) {
  graphemeSegmenter ??= new Intl.Segmenter("ja", { granularity: "grapheme" });

  let count = 0;
  for (const _ of graphemeSegmenter.segment(text)) count += 1;
  return count;
}

export function getPostReadingMinutes(post: Post) {
  const text = post.content.markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[#>*_`~|-]/g, "")
    .replace(/\s+/g, "");
  return Math.max(1, Math.ceil(countCharacters(text) / READING_CHARS_PER_MIN));
}
