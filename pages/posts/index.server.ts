import { defineHandler, defineHead, type InferProps } from "void";

import { createPageHead, withSiteName } from "#/lib/site";
import { sharePage } from "../../src/page-context";
import { getPostFilters, postRepository } from "../../src/posts";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  sharePage(c);
  const [posts, filters] = await Promise.all([postRepository.list(), getPostFilters()]);
  return { posts, filters };
});

export const head = defineHead(() =>
  createPageHead({
    title: withSiteName("記事一覧"),
    description: "satotek.devの記事一覧",
    path: "/posts",
  }),
);
