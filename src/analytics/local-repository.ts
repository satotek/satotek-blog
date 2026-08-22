import type { AnalyticsRepository, PopularPost } from "./types";

/**
 * Analytics data is optional during the first phase. A generated GA4 adapter
 * can replace this implementation without changing the homepage contract.
 */
export class LocalAnalyticsRepository implements AnalyticsRepository {
  async getPopularPosts(): Promise<readonly PopularPost[]> {
    return [];
  }
}
