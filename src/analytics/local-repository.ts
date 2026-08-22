import type { AnalyticsRepository, PopularPost } from "./types";

/**
 * Popular posts are optional. Swap this for a Cloudflare Analytics snapshot
 * or a generated file without changing the homepage contract.
 */
export class LocalAnalyticsRepository implements AnalyticsRepository {
  async getPopularPosts(): Promise<readonly PopularPost[]> {
    return [];
  }
}
