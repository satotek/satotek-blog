import type { PostSummary } from "#/lib/posts/types";
import { postRepository } from "#/lib/posts/repository";
import { categories } from "#/data/navigation";
import { SITE_URL } from "#/lib/site";

export const DEFAULT_POST_LIMIT = 10;
const MAX_POST_LIMIT = 10;

export type PublicPost = {
  slug: string;
  title: string;
  url: string;
  date: string;
  category: string;
  categorySlug: string;
  description: string;
  tags: readonly string[];
};

export type PostListResult = {
  total: number;
  returned: number;
  hasMore: boolean;
  posts: readonly PublicPost[];
};

export type ListPostsFilters = {
  category?: string;
  tag?: string;
};

type BlogToolOptions = {
  getPosts?: () => Promise<readonly PostSummary[]>;
  openPost?: (post: PostSummary) => void | Promise<void>;
};

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP");
}

function categoryForSlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

function postUrl(slug: string) {
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
  return `${origin}/posts/${encodeURIComponent(slug)}`;
}

function publicPost(post: PostSummary): PublicPost {
  const category = categoryForSlug(post.category);

  return {
    slug: post.slug,
    title: post.title,
    url: postUrl(post.slug),
    date: post.date,
    category: category?.name ?? post.category,
    categorySlug: post.category,
    description: post.description,
    tags: [...post.tags],
  };
}

function searchableFields(post: PostSummary) {
  const category = categoryForSlug(post.category);
  return {
    title: normalize(post.title),
    description: normalize(post.description),
    category: normalize(category?.name ?? post.category),
    categorySlug: normalize(post.category),
    tags: post.tags.map(normalize),
  };
}

function searchScore(post: PostSummary, terms: readonly string[]) {
  const fields = searchableFields(post);
  let score = 0;

  for (const term of terms) {
    const titleMatch = fields.title.includes(term);
    const descriptionMatch = fields.description.includes(term);
    const categoryMatch = fields.category.includes(term) || fields.categorySlug.includes(term);
    const tagMatch = fields.tags.some((tag) => tag.includes(term));

    if (!titleMatch && !descriptionMatch && !categoryMatch && !tagMatch) return 0;
    if (titleMatch) score += 4;
    if (tagMatch) score += 3;
    if (categoryMatch) score += 2;
    if (descriptionMatch) score += 1;
  }

  return score;
}

function normalizeLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_POST_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_POST_LIMIT}.`);
  }
  return limit;
}

function resultForPosts(posts: readonly PostSummary[], limit: number): PostListResult {
  const normalizedLimit = normalizeLimit(limit);
  const selected = posts.slice(0, normalizedLimit).map(publicPost);

  return {
    total: posts.length,
    returned: selected.length,
    hasMore: posts.length > selected.length,
    posts: selected,
  };
}

export function searchPostSummaries(
  posts: readonly PostSummary[],
  query: string,
  limit = DEFAULT_POST_LIMIT,
): PostListResult {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (terms.length === 0) throw new Error("query must be a non-empty keyword or phrase.");

  const matched = posts
    .map((post) => ({ post, score: searchScore(post, terms) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.post.date.localeCompare(left.post.date) ||
        left.post.slug.localeCompare(right.post.slug),
    )
    .map(({ post }) => post);

  return resultForPosts(matched, limit);
}

function matchesCategory(postCategory: string, requestedCategory: string) {
  const normalizedRequested = normalize(requestedCategory);
  const knownCategory = categories.find(
    (category) =>
      normalize(category.slug) === normalizedRequested ||
      normalize(category.name) === normalizedRequested,
  );

  return knownCategory
    ? postCategory === knownCategory.slug
    : normalize(postCategory) === normalizedRequested;
}

export function listPostSummaries(
  posts: readonly PostSummary[],
  filters: ListPostsFilters = {},
  limit = DEFAULT_POST_LIMIT,
): PostListResult {
  const category = filters.category?.trim();
  const tag = filters.tag?.trim();
  const normalizedTag = tag ? normalize(tag) : undefined;

  const matched = posts.filter((post) => {
    if (category && !matchesCategory(post.category, category)) return false;
    if (normalizedTag && !post.tags.some((postTag) => normalize(postTag) === normalizedTag)) {
      return false;
    }
    return true;
  });

  return resultForPosts(matched, limit);
}

function inputRecord(input: unknown) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Tool input must be a JSON object.");
  }
  return input as Record<string, unknown>;
}

function requiredString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
}

function optionalString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be a string when provided.`);
  return value.trim() || undefined;
}

function optionalLimit(input: Record<string, unknown>) {
  const value = input.limit;
  if (value === undefined) return DEFAULT_POST_LIMIT;
  if (typeof value !== "number") throw new Error("limit must be an integer from 1 to 10.");
  return normalizeLimit(value);
}

async function openPostInCurrentTab(post: PostSummary) {
  if (typeof window === "undefined")
    throw new Error("open_post is only available in a browser tab.");
  window.location.assign(postUrl(post.slug));
}

export function createBlogWebMcpTools(
  options: BlogToolOptions = {},
): readonly WebMCP.ModelContextTool[] {
  const getPosts = options.getPosts ?? (() => postRepository.list());
  const openPost = options.openPost ?? openPostInCurrentTab;

  return [
    {
      name: "search_posts",
      title: "記事を検索",
      description:
        "Search published satotek.dev articles by title, description, category, or tag. Returns concise metadata and URLs.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword or phrase to match against article metadata.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: MAX_POST_LIMIT,
            description: "Maximum number of results to return, from 1 to 10.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        const record = inputRecord(input);
        const query = requiredString(record, "query");
        const posts = await getPosts();
        return { query, ...searchPostSummaries(posts, query, optionalLimit(record)) };
      },
    },
    {
      name: "list_posts",
      title: "記事一覧",
      description:
        "List published satotek.dev articles, optionally filtered by category or tag. Category names may be Japanese labels or slugs.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Optional category label such as 技術 or slug such as tech.",
          },
          tag: {
            type: "string",
            description: "Optional exact article tag, matched case-insensitively.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: MAX_POST_LIMIT,
            description: "Maximum number of results to return, from 1 to 10.",
          },
        },
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        const record = inputRecord(input);
        const category = optionalString(record, "category");
        const tag = optionalString(record, "tag");
        const posts = await getPosts();
        return {
          filters: { category: category ?? null, tag: tag ?? null },
          ...listPostSummaries(posts, { category, tag }, optionalLimit(record)),
        };
      },
    },
    {
      name: "open_post",
      title: "記事を開く",
      description:
        "Open a published satotek.dev article in the current tab using a slug returned by search_posts or list_posts.",
      inputSchema: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Published article slug returned by a blog search or list.",
          },
        },
        required: ["slug"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        const slug = requiredString(inputRecord(input), "slug");
        const posts = await getPosts();
        const post = posts.find((candidate) => candidate.slug === slug);
        if (!post) {
          throw new Error(
            `No published article was found for slug "${slug}". Search for an article first.`,
          );
        }

        await openPost(post);
        return { status: "opening", post: publicPost(post) };
      },
    },
  ];
}
