import { LocalAnalyticsRepository } from "./local-repository";

/** Keep popular-post data behind a replaceable boundary. */
export const analyticsRepository = new LocalAnalyticsRepository();
