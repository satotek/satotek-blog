import { LocalAnalyticsRepository } from "./local-repository";

/** Keep analytics behind a replaceable boundary for the future GA4 Data API job. */
export const analyticsRepository = new LocalAnalyticsRepository();
