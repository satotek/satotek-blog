import { parse as parseYaml } from "yaml";
import { z } from "zod";

import { MEDIA_BASE_URL } from "../site";
import { mediaUrlForKey, postAssetKey } from "./post-assets";
import { countReadingMinutes, type PostSummary } from "./types";

const postFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1),
    draft: z.boolean().default(false),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    cover: z.string().min(1).optional(),
  })
  .strict();

export type PostSource = {
  slug: string;
  draft: boolean;
  summary: PostSummary;
  markdown: string;
};

/**
 * 原文の `./assets/photo.webp` を配信 URL に開く。MDX 本文は rehype 側が
 * 同じことをするが、cover と llms-full.txt は原文のまま扱うのでここで解く。
 */
function resolveAssetPath(slug: string, source: string) {
  const key = postAssetKey(slug, source);
  return key ? mediaUrlForKey(MEDIA_BASE_URL, key) : source;
}

const markdownImagePattern = /(!\[[^\]]*\]\()(\.\/assets\/[^\s)]+)/g;

function splitFrontmatter(source: string) {
  const match = /^(?:\uFEFF)?---\s*\r?\n([\s\S]*?)\r?\n---(?:\s*\r?\n|$)/.exec(source);
  if (!match) {
    throw new Error("Markdown post must start with YAML frontmatter");
  }

  return {
    frontmatter: parseYaml(match[1]),
    markdown: source.slice(match[0].length).trim(),
  };
}

export function parsePostSource(source: string, slug: string): PostSource {
  const { frontmatter, markdown: authored } = splitFrontmatter(source);
  const metadata = postFrontmatterSchema.parse(frontmatter);
  const { draft, cover, ...summaryMetadata } = metadata;
  const markdown = authored.replace(
    markdownImagePattern,
    (_match, prefix: string, path: string) => `${prefix}${resolveAssetPath(slug, path)}`,
  );
  const firstImage = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(markdown)?.[1];
  const resolvedCover = cover ? resolveAssetPath(slug, cover) : undefined;

  return {
    slug,
    draft,
    summary: {
      ...summaryMetadata,
      slug,
      readingMinutes: countReadingMinutes(markdown),
      ...(resolvedCover || firstImage ? { cover: resolvedCover ?? firstImage } : {}),
    },
    markdown,
  };
}
