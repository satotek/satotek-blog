export const categories = [
  { slug: "tech", name: "技術" },
  { slug: "gadgets", name: "ガジェット" },
  { slug: "travel", name: "旅行" },
  { slug: "daily", name: "日常" },
] as const;

export type Category = (typeof categories)[number];
export type CategorySlug = Category["slug"];
