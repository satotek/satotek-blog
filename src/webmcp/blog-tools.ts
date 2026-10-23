import type { PostSummary } from "#/lib/posts/types";
import { postRepository } from "#/lib/posts/repository";
import {
  DEFAULT_POST_LIMIT,
  listPublishedPosts,
  MAX_POST_LIMIT,
  normalizeLimit,
  searchPublishedPosts,
  toPublicPost,
  type ListPostsFilters,
  type PostListResult,
  type PublicPost,
} from "#/lib/posts/query";
import { SITE_URL } from "#/lib/site";

export { DEFAULT_POST_LIMIT };
export type { ListPostsFilters, PostListResult, PublicPost };

type BlogToolOptions = {
  getPosts?: () => Promise<readonly PostSummary[]>;
  openPost?: (post: PostSummary) => void | Promise<void>;
};

function browserOrigin() {
  return typeof window === "undefined" ? SITE_URL : window.location.origin;
}

export function searchPostSummaries(
  posts: readonly PostSummary[],
  query: string,
  limit = DEFAULT_POST_LIMIT,
): PostListResult {
  return searchPublishedPosts(posts, query, limit, browserOrigin());
}

export function listPostSummaries(
  posts: readonly PostSummary[],
  filters: ListPostsFilters = {},
  limit = DEFAULT_POST_LIMIT,
): PostListResult {
  return listPublishedPosts(posts, filters, limit, browserOrigin());
}

function publicPost(post: PostSummary): PublicPost {
  return toPublicPost(post, browserOrigin());
}

function postUrl(slug: string) {
  return `${browserOrigin()}/posts/${encodeURIComponent(slug)}`;
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
