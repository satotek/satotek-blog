import type { RankedPost } from "../posts/query.ts";

export type PopularPost = {
  slug: string;
  title: string;
  path: string;
  views: number;
};

export type PopularPostsResult = {
  range: "7d";
  source: "ga4" | "unavailable";
  posts: readonly RankedPost[];
};

export type PostViewsResult = {
  slug: string;
  range: "all";
  source: "ga4" | "unavailable";
  views: number | null;
};
