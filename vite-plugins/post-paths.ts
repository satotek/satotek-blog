import { join, relative, resolve, sep } from "node:path";

export const contentPostsDirectory = resolve(process.cwd(), "src/content/posts");

function postSegments(file: string) {
  return relative(contentPostsDirectory, resolve(file)).split(sep);
}

/** src/content/posts/<slug>/assets/<file> なら slug と file を返す。 */
export function postAsset(file: string) {
  const segments = postSegments(file);
  if (segments.length !== 3 || segments[1] !== "assets") return undefined;
  if (segments[0] === "" || segments[0] === "..") return undefined;
  return { slug: segments[0], file: segments[2] };
}

export function isMarkdownPost(file: string) {
  const segments = postSegments(file);
  return segments.length === 2 && segments[1] === "index.mdx";
}

export function postMarkdownFor(slug: string) {
  return join(contentPostsDirectory, slug, "index.mdx");
}
