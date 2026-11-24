import { defineHandler, defineHead, type InferProps } from "void";

import { SITE_NAME, createPageHead } from "#/lib/site";
import { sharePage } from "../src/page-context";
import { getCategories, getTags, postRepository } from "../src/posts";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const [posts, categories, tags] = await Promise.all([
    postRepository.list(),
    getCategories(),
    getTags(),
  ]);
  return { posts, categories, tags };
});

export const head = defineHead(() =>
  createPageHead({
    title: SITE_NAME,
    description: "nosukeの個人ブログ。技術、ガジェット、旅行、日常についての記録。",
    path: "/",
  }),
);
