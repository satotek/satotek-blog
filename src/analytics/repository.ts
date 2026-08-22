import type { AnalyticsRepository } from "./types";
import { getPopularPosts } from "./functions";

/** Keep the GA4-backed data source behind a replaceable boundary. */
export const analyticsRepository = {
  getPopularPosts,
} satisfies AnalyticsRepository;
