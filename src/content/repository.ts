import { MarkdownPostSummaryRepository } from "./markdown-posts";

/** Replace this adapter with a Headless CMS repository when that becomes necessary. */
export const postRepository = new MarkdownPostSummaryRepository();
