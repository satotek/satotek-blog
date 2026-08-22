import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

import { generateMediaVariants } from "@satotek/content-pipeline";

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
  help: boolean;
  key?: string;
  prefix: string;
  variants: boolean;
};

type Upload = {
  file: string;
  key: string;
};

function printUsage() {
  console.log(`Usage:
  bun run upload-media -- --file <path> --key <r2-key>
  bun run upload-media -- --directory <path> [--prefix <r2-prefix>]

Options:
  --file <path>       Upload one local image file.
  --key <r2-key>      Destination key, for example first-post/photo.webp.
  --directory <path>  Upload every file under a local directory.
  --prefix <prefix>   Prefix for directory uploads.
  --no-variants       Upload only the original files.
  --bucket <name>     R2 bucket (default: R2_BUCKET_NAME or ${defaultBucket}).
  --help              Show this help.

The upload uses the authenticated Wrangler CLI, so local uploads use
Cloudflare OAuth (or CLOUDFLARE_API_TOKEN in CI) instead of R2 S3 secrets.
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
    help: false,
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
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--key":
        options.key = requiredValue(args, ++index, "--key");
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

  if (options.file && options.directory) {
    throw new Error("--file and --directory cannot be used together");
  }

  if (!options.help && !options.file && !options.directory) {
    throw new Error("Specify --file or --directory");
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

async function createUploads(options: Options): Promise<Upload[]> {
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

async function expandUploads(uploads: Upload[], outputDirectory: string, variants: boolean) {
  if (!variants) return uploads;

  const expanded = [...uploads];
  for (const upload of uploads) {
    const generated = await generateMediaVariants({
      sourcePath: upload.file,
      key: upload.key,
      outputDirectory,
    });
    expanded.push(...generated.map(({ file, key }) => ({ file, key })));
  }
  return expanded;
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
    const expandedUploads = await expandUploads(uploads, temporaryDirectory, options.variants);
    const variantCount = expandedUploads.length - uploads.length;
    if (variantCount > 0) console.log(`Generated ${variantCount} responsive image variants.`);

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
