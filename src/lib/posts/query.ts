import { categories } from "../../data/categories";
import type { PopularPost } from "../../analytics/types";
import { SITE_URL } from "../site-url";
import type { PostSummary } from "./types";

export const DEFAULT_POST_LIMIT = 10;
export const MAX_POST_LIMIT = 10;

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

export type RankedPost = PublicPost & {
  rank: number;
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

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP");
}

function categoryForSlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function toPublicPost(post: PostSummary, origin = SITE_URL): PublicPost {
  const category = categoryForSlug(post.category);

  return {
    slug: post.slug,
    title: post.title,
    url: `${origin}/posts/${encodeURIComponent(post.slug)}`,
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

export function normalizeLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_POST_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_POST_LIMIT}.`);
  }
  return limit;
}

function resultForPosts(
  posts: readonly PostSummary[],
  limit: number,
  origin: string,
): PostListResult {
  const normalizedLimit = normalizeLimit(limit);
  const selected = posts.slice(0, normalizedLimit).map((post) => toPublicPost(post, origin));

  return {
    total: posts.length,
    returned: selected.length,
    hasMore: posts.length > selected.length,
    posts: selected,
  };
}

export function searchPublishedPosts(
  posts: readonly PostSummary[],
  query: string,
  limit = DEFAULT_POST_LIMIT,
  origin = SITE_URL,
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

  return resultForPosts(matched, limit, origin);
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

export function listPublishedPosts(
  posts: readonly PostSummary[],
  filters: ListPostsFilters = {},
  limit = DEFAULT_POST_LIMIT,
  origin = SITE_URL,
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

  return resultForPosts(matched, limit, origin);
}

export function findPublishedPost(posts: readonly PostSummary[], slug: string, origin = SITE_URL) {
  const post = posts.find((candidate) => candidate.slug === slug);
  return post ? toPublicPost(post, origin) : undefined;
}

export function taxonomyForPosts(posts: readonly PostSummary[]) {
  const categoryCounts = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: posts.filter((post) => post.category === category.slug).length,
  }));
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return {
    categories: categoryCounts,
    tags: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ja")),
  };
}

/** GA4 の順位を公開記事へ突き合わせ、閲覧数は外す。 */
export function rankPublishedPosts(
  popular: readonly PopularPost[],
  posts: readonly PostSummary[],
  origin = SITE_URL,
): readonly RankedPost[] {
  const ranked: RankedPost[] = [];

  for (const item of popular) {
    const post = posts.find((candidate) => candidate.slug === item.slug);
    if (!post) continue;
    ranked.push({ rank: ranked.length + 1, ...toPublicPost(post, origin) });
  }

  return ranked;
}
