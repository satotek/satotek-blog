import { postRepository } from "#/lib/posts/repository";

export const categories = [
  { slug: "tech", name: "技術" },
  { slug: "gadgets", name: "ガジェット" },
  { slug: "travel", name: "旅行" },
  { slug: "daily", name: "日常" },
] as const;

export type Category = (typeof categories)[number];
export type CategorySlug = Category["slug"];

export async function getCategories() {
  const posts = await postRepository.list();

  return categories.map((category) => ({
    ...category,
    count: posts.filter((post) => post.category === category.slug).length,
  }));
}

export async function getTags() {
  const posts = await postRepository.list();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
}

export function categoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function tagPath(tag: string) {
  return `/tags/${encodeURIComponent(tag)}`;
}
