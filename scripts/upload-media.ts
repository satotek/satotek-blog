import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

import { generateMediaVariants, mediaVariantKeys } from "@satotek/content-pipeline";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultBucket = "satotek-media";
const defaultPublicBaseUrl = "https://img.satotek.dev";
const cacheControl = "public, max-age=31536000, immutable";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

type Options = {
  bucket: string;
  directory?: string;
  file?: string;
  force: boolean;
  help: boolean;
  key?: string;
  post?: string;
  posts: boolean;
  prefix: string;
  variants: boolean;
};

type Upload = {
  file: string;
  key: string;
};

function printUsage() {
  console.log(`Usage:
  bun run upload-media -- --posts
  bun run upload-media -- --post <slug>
  bun run upload-media -- --file <path> --key <r2-key>
  bun run upload-media -- --directory <path> [--prefix <r2-prefix>]

Options:
  --posts             Upload every src/content/posts/*/assets/ file, keyed by slug.
  --post <slug>       Upload only src/content/posts/<slug>/assets/.
  --file <path>       Upload one local image file.
  --key <r2-key>      Destination key, for example first-post/photo.webp.
  --directory <path>  Upload every file under a local directory.
  --prefix <prefix>   Prefix for directory uploads.
  --no-variants       Upload only the original files.
  --force             Upload even if the key already exists on the public URL.
  --bucket <name>     R2 bucket (default: R2_BUCKET_NAME or ${defaultBucket}).
  --help              Show this help.

The upload uses the authenticated Wrangler CLI, so local uploads use
Cloudflare OAuth (or CLOUDFLARE_API_TOKEN in CI) instead of R2 S3 secrets.

Keys that already return 200 from the public URL are skipped, because media is
served as immutable and an overwrite would not reach cached readers anyway.
Give a changed image a new file name instead of overwriting it.
`);
}

function requiredValue(args: readonly string[], index: number, option: string) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseArgs(args: readonly string[]): Options {
  const options: Options = {
    bucket: process.env.R2_BUCKET_NAME?.trim() || defaultBucket,
    force: false,
    help: false,
    posts: false,
    prefix: "",
    variants: true,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--bucket":
        options.bucket = requiredValue(args, ++index, "--bucket");
        break;
      case "--directory":
        options.directory = requiredValue(args, ++index, "--directory");
        break;
      case "--file":
        options.file = requiredValue(args, ++index, "--file");
        break;
      case "--force":
        options.force = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--key":
        options.key = requiredValue(args, ++index, "--key");
        break;
      case "--post":
        options.post = requiredValue(args, ++index, "--post");
        break;
      case "--posts":
        options.posts = true;
        break;
      case "--prefix":
        options.prefix = requiredValue(args, ++index, "--prefix");
        break;
      case "--no-variants":
        options.variants = false;
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }

  const sources = [options.file, options.directory, options.post, options.posts || undefined];
  if (sources.filter(Boolean).length > 1) {
    throw new Error("--posts, --post, --file and --directory cannot be combined");
  }

  if (!options.help && sources.every((source) => !source)) {
    throw new Error("Specify --posts, --post, --file or --directory");
  }

  if (options.file && !options.key) {
    throw new Error("--key is required with --file");
  }

  if (options.directory && options.key) {
    throw new Error("--key cannot be used with --directory; use --prefix instead");
  }

  return options;
}

function normalizeKey(key: string) {
  const normalized = key.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid R2 key: ${key}`);
  }
  return normalized;
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files.sort();
}

/**
 * 記事の原本は index.mdx の隣の assets/ にある。R2 のキーは記事の slug から
 * 導けるので、記事を書く側がキーを打ち込む必要はない。
 */
async function createPostUploads(slug?: string): Promise<Upload[]> {
  const postsDirectory = join(projectRoot, "src/content/posts");
  const uploads: Upload[] = [];

  if (slug) {
    const assetsDirectory = join(postsDirectory, normalizeKey(slug), "assets");
    if (!(await stat(assetsDirectory).catch(() => undefined))?.isDirectory()) {
      throw new Error(`No assets directory for post: ${slug}`);
    }
  }

  for (const entry of await readdir(postsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (slug && entry.name !== slug) continue;

    const assetsDirectory = join(postsDirectory, entry.name, "assets");
    let files: string[];
    try {
      files = await collectFiles(assetsDirectory);
    } catch {
      continue;
    }

    for (const file of files) {
      uploads.push({
        file,
        key: normalizeKey(`${entry.name}/${relative(assetsDirectory, file).split(sep).join("/")}`),
      });
    }
  }

  return uploads;
}

async function createUploads(options: Options): Promise<Upload[]> {
  if (options.posts || options.post) return createPostUploads(options.post);

  if (options.file) {
    const file = resolve(projectRoot, options.file);
    const fileInfo = await stat(file);
    if (!fileInfo.isFile()) throw new Error(`Not a file: ${options.file}`);
    return [{ file, key: normalizeKey(options.key ?? "") }];
  }

  const directory = resolve(projectRoot, options.directory ?? "");
  const directoryInfo = await stat(directory);
  if (!directoryInfo.isDirectory()) throw new Error(`Not a directory: ${options.directory}`);

  const prefix = options.prefix ? `${normalizeKey(options.prefix)}/` : "";
  return (await collectFiles(directory)).map((file) => ({
    file,
    key: normalizeKey(`${prefix}${relative(directory, file).split(sep).join("/")}`),
  }));
}

function contentType(file: string) {
  return contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream";
}

async function existsOnPublicUrl(key: string) {
  try {
    const response = await fetch(publicUrl(key), { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 元画像と派生画像がすべて公開 URL にあるものは、派生画像の生成ごと飛ばす。
 * 一部でも欠けていれば、欠けているキーだけを上げる。
 */
async function expandUploads(
  uploads: Upload[],
  outputDirectory: string,
  { force, variants }: Pick<Options, "force" | "variants">,
) {
  const expanded: Upload[] = [];
  let skipped = 0;

  for (const upload of uploads) {
    const variantKeys = variants ? mediaVariantKeys(upload.key).map(({ key }) => key) : [];
    const keys = [upload.key, ...variantKeys];
    const exists = force ? keys.map(() => false) : await Promise.all(keys.map(existsOnPublicUrl));
    const missing = new Set(keys.filter((_, index) => !exists[index]));
    skipped += keys.length - missing.size;

    if (missing.has(upload.key)) expanded.push(upload);
    if (variantKeys.some((key) => missing.has(key))) {
      const generated = await generateMediaVariants({
        sourcePath: upload.file,
        key: upload.key,
        outputDirectory,
      });
      for (const { file, key } of generated) {
        if (missing.has(key)) expanded.push({ file, key });
      }
    }
  }

  return { skipped, uploads: expanded };
}

function publicUrl(key: string) {
  const baseUrl = (
    process.env.R2_PUBLIC_BASE_URL?.trim() ||
    process.env.VITE_MEDIA_BASE_URL?.trim() ||
    defaultPublicBaseUrl
  ).replace(/\/+$/, "");
  return `${baseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function uploadWithWrangler(upload: Upload, bucket: string) {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        "run",
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket}/${upload.key}`,
        "--remote",
        "--file",
        upload.file,
        "--content-type",
        contentType(upload.file),
        "--cache-control",
        cacheControl,
        "--force",
      ],
      { cwd: projectRoot, stdio: "inherit" },
    );

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else
        reject(
          new Error(`Wrangler upload failed for ${upload.key} (exit code ${code ?? "unknown"})`),
        );
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const uploads = await createUploads(options);
  if (uploads.length === 0) {
    throw new Error("No files found to upload");
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "satotek-media-"));
  try {
    const { skipped, uploads: expandedUploads } = await expandUploads(
      uploads,
      temporaryDirectory,
      options,
    );
    if (skipped > 0)
      console.log(`Skipped ${skipped} files that already exist (use --force to upload them).`);
    if (expandedUploads.length === 0) {
      console.log("Nothing to upload.");
      return;
    }
    console.log(`Uploading ${expandedUploads.length} files.`);

    for (const upload of expandedUploads) {
      console.log(`${upload.file} -> ${options.bucket}/${upload.key}`);
      await uploadWithWrangler(upload, options.bucket);
      console.log(publicUrl(upload.key));
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
