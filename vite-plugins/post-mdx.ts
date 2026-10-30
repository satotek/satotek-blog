import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import mdx from "@mdx-js/rollup";
import { createMdxPlugins, readImageDimensions } from "@satotek/content-pipeline";

import { createResponsiveMedia } from "../src/lib/media-variants";
import { mediaUrlForKey } from "../src/lib/posts/post-assets";
import { postAsset } from "./post-paths";

const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");

const imageSizes = "(max-width: 768px) 100vw, 768px";

function isAbsoluteUrl(source: string) {
  try {
    new URL(source);
    return true;
  } catch {
    return false;
  }
}

/**
 * 記事に隣接する assets/ の原本から、配信 URL と実寸を組み立てる。
 * 原本がリポジトリにあるので寸法はここで測れる。生成物をコミットする
 * マニフェストは要らない。
 */
async function resolvePostImage(source: string, filePath: string | undefined) {
  if (isAbsoluteUrl(source)) {
    const responsive = createResponsiveMedia(source, {
      baseUrl: mediaBaseUrl,
      sizes: imageSizes,
    });
    return responsive ? { ...responsive } : undefined;
  }

  if (!filePath) {
    throw new Error(`Cannot resolve the relative image ${source}: the MDX path is unknown`);
  }

  const assetPath = resolve(dirname(filePath.split("?")[0]), source);
  const asset = postAsset(assetPath);
  if (!asset) {
    throw new Error(`${source} in ${filePath} must live in the post's own assets/ directory`);
  }
  if (!existsSync(assetPath)) {
    throw new Error(
      `Missing image ${relative(process.cwd(), assetPath)} referenced by ${filePath}`,
    );
  }

  const url = mediaUrlForKey(mediaBaseUrl, `${asset.slug}/${asset.file}`);
  const responsive = createResponsiveMedia(url, {
    baseUrl: mediaBaseUrl,
    sizes: imageSizes,
  });
  const dimensions = await readImageDimensions(assetPath);

  return { src: url, ...responsive, ...dimensions };
}

export function postMdx() {
  const plugin = mdx({
    jsxImportSource: "react",
    ...createMdxPlugins({
      resolveImage: (source, { filePath }) => resolvePostImage(source, filePath),
    }),
  });

  // 原文は llms-full.txt と読了時間が ?raw で読む。MDX プラグインは
  // enforce: "pre" で先に走るので、明示的に素通しさせる必要がある。
  const transform = plugin.transform;
  return {
    ...plugin,
    enforce: "pre" as const,
    transform(this: unknown, code: string, id: string) {
      if (id.includes("?raw")) return null;
      return (transform as (code: string, id: string) => unknown).call(this, code, id);
    },
  };
}
