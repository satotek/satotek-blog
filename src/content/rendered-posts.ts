import type { TocItem } from "./types";

export type RenderedPost = {
  html: string;
  toc: readonly TocItem[];
};

const renderedPostModules = import.meta.glob<RenderedPost>("./generated/*.json", {
  eager: true,
  import: "default",
});

const renderedPosts = new Map(
  Object.entries(renderedPostModules).map(([filePath, renderedPost]) => [
    filePath.slice(filePath.lastIndexOf("/") + 1, -5),
    renderedPost,
  ]),
);

export function getRenderedPost(slug: string) {
  return renderedPosts.get(slug);
}
