export type PopularPost = {
  slug: string;
  title: string;
  path: string;
  views: number;
};

export interface AnalyticsRepository {
  getPopularPosts(): Promise<readonly PopularPost[]>;
}
