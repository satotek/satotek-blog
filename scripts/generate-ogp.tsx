import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Resvg } from "@resvg/resvg-js";
import satori, { type Font as SatoriFont } from "satori";
import { parseMarkdownSource, type MarkdownSource } from "../src/lib/posts/markdown-source";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "src/content/posts");
const localOutputDirectory = join(projectRoot, ".ogp");
const ogpKeyPrefix = "blog/ogp";
const imageWidth = 1200;
const imageHeight = 630;
const templateVersion = "satotek-1";
const fontUrls = {
  bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Bold.ttf",
  regular:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Regular.ttf",
} as const;

type CliOptions = {
  all: boolean;
  file?: string;
  outputDirectory: string;
  slug?: string;
  tags?: readonly string[];
  title?: string;
  upload: boolean;
  help: boolean;
};

type R2Uploader = {
  put(key: string, image: Buffer, contentHash: string): Promise<"uploaded" | "skipped">;
};

function printUsage() {
  console.log(`Usage:
  bun run generate-ogp -- --file src/content/posts/<slug>/index.mdx
  bun run generate-ogp -- --all
  bun run generate-ogp -- --file <path> --upload
  bun run generate-ogp -- --all --upload

Options:
  --all                 Generate every published post.
  --file <path>         Generate the post described by one Markdown file.
  --output-dir <path>   Write local PNGs to this directory (default: .ogp).
  --slug <slug>         Override the slug when using --file.
  --title <title>       Override the title when using --file.
  --tags <a,b,c>        Override tags when using --file.
  --upload              Upload to Cloudflare R2 instead of writing local PNGs.
  --help                Show this help.
`);
}

function parseArgs(args: readonly string[]): CliOptions {
  const options: CliOptions = {
    all: false,
    outputDirectory: localOutputDirectory,
    upload: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--all":
        options.all = true;
        break;
      case "--file":
        options.file = requiredValue(args, ++index, "--file");
        break;
      case "--output-dir":
        options.outputDirectory = resolve(
          projectRoot,
          requiredValue(args, ++index, "--output-dir"),
        );
        break;
      case "--slug":
        options.slug = requiredValue(args, ++index, "--slug");
        break;
      case "--tags":
        options.tags = requiredValue(args, ++index, "--tags")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        break;
      case "--title":
        options.title = requiredValue(args, ++index, "--title");
        break;
      case "--upload":
        options.upload = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (options.all && options.file) {
    throw new Error("--all and --file cannot be used together");
  }

  if (options.all && (options.slug || options.tags || options.title)) {
    throw new Error("--slug, --title, and --tags require --file");
  }

  if (!options.help && !options.all && !options.file) {
    throw new Error("Specify --all or --file");
  }

  return options;
}

function requiredValue(args: readonly string[], index: number, option: string) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function withOverrides(source: MarkdownSource, options: CliOptions): MarkdownSource {
  if (!options.slug && !options.tags && !options.title) return source;

  return {
    ...source,
    slug: options.slug ?? source.slug,
    summary: {
      ...source.summary,
      slug: options.slug ?? source.summary.slug,
      ...(options.tags ? { tags: options.tags } : {}),
      ...(options.title ? { title: options.title } : {}),
    },
  };
}

async function readPost(filePath: string, options: CliOptions, allowDraft = false) {
  const markdown = await readFile(filePath, "utf8");
  const slug = options.slug ?? basename(dirname(filePath));
  const source = parseMarkdownSource(markdown, slug);
  if (source.draft && !allowDraft) {
    throw new Error(`Refusing to generate an OGP image for a draft: ${source.slug}`);
  }
  return withOverrides(source, options);
}

async function readSources(options: CliOptions) {
  if (options.file) {
    return [await readPost(resolve(projectRoot, options.file), options)];
  }

  const entries = await readdir(postsDirectory, { withFileTypes: true });
  const sources: MarkdownSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = await readPost(join(postsDirectory, entry.name, "index.mdx"), options, true);
    if (!source.draft) sources.push(source);
  }

  return sources.sort(
    (left, right) =>
      right.summary.date.localeCompare(left.summary.date) ||
      left.summary.slug.localeCompare(right.summary.slug),
  );
}

async function loadFont(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download OGP font (${response.status}): ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function loadFonts(): Promise<SatoriFont[]> {
  const [regular, bold] = await Promise.all([loadFont(fontUrls.regular), loadFont(fontUrls.bold)]);

  return [
    { data: regular, name: "Zen Kaku Gothic New", weight: 400, style: "normal" },
    { data: bold, name: "Zen Kaku Gothic New", weight: 700, style: "normal" },
  ];
}

function compactText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  return characters.length > maxLength ? `${characters.slice(0, maxLength - 1).join("")}…` : text;
}

function OGPCard({ source }: { source: MarkdownSource }) {
  const title = compactText(source.summary.title, 48);
  const tags = source.summary.tags.slice(0, 4).map((tag) => compactText(tag, 18));
  const titleFontSize = title.length > 24 ? 52 : 58;

  return (
    <div
      style={{
        backgroundColor: "#f3ece0",
        border: "4px solid #37322b",
        borderRadius: 32,
        color: "#37322b",
        display: "flex",
        flexDirection: "column",
        height: imageHeight,
        overflow: "hidden",
        padding: "52px 64px",
        position: "relative",
        width: imageWidth,
      }}
    >
      <div
        style={{
          backgroundColor: "#e3d0bb",
          borderRadius: 280,
          height: 560,
          position: "absolute",
          right: -180,
          top: -240,
          width: 560,
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div style={{ alignItems: "center", display: "flex" }}>
          <div
            style={{
              alignItems: "center",
              backgroundColor: "#ae543e",
              borderRadius: 20,
              color: "#fffaf4",
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              height: 76,
              justifyContent: "center",
              width: 76,
            }}
          >
            s.
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginLeft: 18 }}>satotek.dev</div>
        </div>
        <div
          style={{
            color: "#8c6658",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {source.summary.category}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#ae543e",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 18,
          }}
        >
          ARTICLE
        </div>
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.22,
            maxWidth: 1020,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, minHeight: 48, position: "relative" }}>
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              backgroundColor: "#fbf7f1",
              border: "2px solid #d8c6b5",
              borderRadius: 24,
              color: "#7b4c3d",
              fontSize: 22,
              padding: "8px 18px",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
}

async function renderOgp(source: MarkdownSource, fonts: readonly SatoriFont[]) {
  const svg = await satori(<OGPCard source={source} />, {
    embedFont: true,
    fonts: [...fonts],
    height: imageHeight,
    width: imageWidth,
  });

  return Buffer.from(new Resvg(svg).render().asPng());
}

function contentHash(source: MarkdownSource) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        tags: source.summary.tags,
        templateVersion,
        title: source.summary.title,
      }),
    )
    .digest("hex");
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createR2Uploader(): R2Uploader {
  const accountId = requiredEnvironment("R2_ACCOUNT_ID");
  const bucket = requiredEnvironment("R2_BUCKET_NAME");
  const accessKeyId = requiredEnvironment("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnvironment("R2_SECRET_ACCESS_KEY");
  const endpoint =
    process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;
  const client = new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    region: "auto",
  });

  return {
    async put(key, image, hash) {
      const object = { Bucket: bucket, Key: key };
      let existingHash: string | undefined;

      try {
        const head = await client.send(new HeadObjectCommand(object));
        existingHash = head.Metadata?.["content-hash"];
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }

      if (existingHash === hash) return "skipped";

      await client.send(
        new PutObjectCommand({
          ...object,
          Body: image,
          CacheControl: "public, max-age=31536000, immutable",
          ContentType: "image/png",
          Metadata: { "content-hash": hash },
        }),
      );
      return "uploaded";
    },
  };
}

function isNotFound(error: unknown) {
  if (error instanceof Error && error.name === "NotFound") return true;
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return false;
  const metadata = error.$metadata;
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "httpStatusCode" in metadata &&
    metadata.httpStatusCode === 404
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const sources = await readSources(options);
  if (sources.length === 0) {
    throw new Error("No published Markdown posts found");
  }

  const fonts = await loadFonts();
  const uploader = options.upload ? createR2Uploader() : undefined;
  if (!uploader) await mkdir(options.outputDirectory, { recursive: true });

  for (const source of sources) {
    const image = await renderOgp(source, fonts);
    const hash = contentHash(source);
    const key = `${ogpKeyPrefix}/${source.slug}.png`;

    if (uploader) {
      const result = await uploader.put(key, image, hash);
      console.log(`${result} ${key}`);
    } else {
      await writeFile(join(options.outputDirectory, `${source.slug}.png`), image);
      console.log(`written ${join(options.outputDirectory, `${source.slug}.png`)}`);
    }
  }
}

await main();
