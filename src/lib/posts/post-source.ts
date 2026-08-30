import { parse as parseYaml } from "yaml";
import { z } from "zod";

import { countReadingMinutes, type PostSummary } from "./types";

const postFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().min(1),
    draft: z.boolean().default(false),
    description: z.string().default(""),
    tags: z.array(z.string()).default([]),
    cover: z.string().url().optional(),
  })
  .strict();

export type PostSource = {
  slug: string;
  draft: boolean;
  summary: PostSummary;
  markdown: string;
};

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
  const { frontmatter, markdown } = splitFrontmatter(source);
  const metadata = postFrontmatterSchema.parse(frontmatter);
  const { draft, cover, ...summaryMetadata } = metadata;
  const firstImage = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(markdown)?.[1];

  return {
    slug,
    draft,
    summary: {
      ...summaryMetadata,
      slug,
      readingMinutes: countReadingMinutes(markdown),
      ...(cover || firstImage ? { cover: cover ?? firstImage } : {}),
    },
    markdown,
  };
}
