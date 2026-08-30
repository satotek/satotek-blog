import { PostSummaryRepositoryImpl } from "./post-summaries";

/** Replace this adapter with a Headless CMS repository when that becomes necessary. */
export const postRepository = new PostSummaryRepositoryImpl();
