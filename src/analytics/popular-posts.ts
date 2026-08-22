import type { PopularPost } from "./types";

export function postPathToSlug(path: string) {
  const pathname = path.split(/[?#]/, 1)[0] ?? path;
  const match = /^\/posts\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export function aggregatePopularPosts(posts: readonly PopularPost[]): readonly PopularPost[] {
  const postsBySlug = new Map<string, PopularPost>();

  for (const post of posts) {
    const existing = postsBySlug.get(post.slug);

    if (!existing) {
      postsBySlug.set(post.slug, post);
      continue;
    }

    postsBySlug.set(post.slug, {
      ...existing,
      title: existing.title || post.title,
      views: existing.views + post.views,
    });
  }

  return [...postsBySlug.values()].sort(
    (left, right) => right.views - left.views || left.slug.localeCompare(right.slug),
  );
}
