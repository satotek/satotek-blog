import {
  DEFAULT_POST_LIMIT,
  MAX_POST_LIMIT,
  normalizeLimit,
  type ListPostsFilters,
  type PostListResult,
  type PublicPost,
} from "#/lib/posts/query";
import { SITE_URL } from "#/lib/site";

export { DEFAULT_POST_LIMIT };
export type { ListPostsFilters, PostListResult, PublicPost };

/** /api の JSON を読む。テストでは Worker を立てずに差し替える。 */
export type ApiFetch = (path: string) => Promise<Response>;

type BlogToolOptions = {
  fetchApi?: ApiFetch;
  openPost?: (post: PublicPost) => void | Promise<void>;
};

function browserOrigin() {
  return typeof window === "undefined" ? SITE_URL : window.location.origin;
}

function postUrl(slug: string) {
  return `${browserOrigin()}/posts/${encodeURIComponent(slug)}`;
}

/** 記事データはブラウザに持たず、検索も一覧も API Worker に任せる。 */
async function readApi<T>(fetchApi: ApiFetch, path: string): Promise<T | undefined> {
  const response = await fetchApi(path);
  if (response.status === 404) return undefined;

  const body = (await response.json().catch(() => undefined)) as
    | (T & { error?: string })
    | undefined;
  if (!response.ok) {
    throw new Error(body?.error ?? `The blog API returned ${response.status}.`);
  }
  if (body === undefined) throw new Error("The blog API returned an unreadable response.");
  return body;
}

function apiPath(pathname: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
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

async function openPostInCurrentTab(post: PublicPost) {
  if (typeof window === "undefined")
    throw new Error("open_post is only available in a browser tab.");
  window.location.assign(postUrl(post.slug));
}

export function createBlogWebMcpTools(
  options: BlogToolOptions = {},
): readonly WebMCP.ModelContextTool[] {
  const fetchApi = options.fetchApi ?? ((path: string) => fetch(path));
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
        const limit = optionalLimit(record);
        const result = await readApi<{ query: string } & PostListResult>(
          fetchApi,
          apiPath("/api/search", { q: query, limit }),
        );
        if (!result) throw new Error("The blog search API is unavailable.");
        return { ...result, query };
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
        const limit = optionalLimit(record);
        const result = await readApi<PostListResult>(
          fetchApi,
          apiPath("/api/posts", { category, tag, limit }),
        );
        if (!result) throw new Error("The blog list API is unavailable.");
        return { filters: { category: category ?? null, tag: tag ?? null }, ...result };
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
        const post = await readApi<PublicPost>(fetchApi, `/api/posts/${encodeURIComponent(slug)}`);
        if (!post) {
          throw new Error(
            `No published article was found for slug "${slug}". Search for an article first.`,
          );
        }

        await openPost(post);
        return { status: "opening", post: { ...post, url: postUrl(post.slug) } };
      },
    },
  ];
}
