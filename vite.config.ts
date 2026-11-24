import tailwindcss from "@tailwindcss/vite";
import { voidReact } from "@void/react/plugin";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";

import { postContentWatcher } from "./vite-plugins/post-content-watcher";
import { postMdx } from "./vite-plugins/post-mdx";
import { siteFiles } from "./vite-plugins/site-files";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.tsx", "vite-plugins/**/*.test.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx}": "vp check --fix",
  },
  // テストは純粋な関数だけを見るので、Void や MDX の変換を通さない。
  plugins:
    mode === "test"
      ? []
      : [
          postMdx(),
          postContentWatcher(),
          tailwindcss(),
          siteFiles(),
          voidPlugin(),
          voidReact({ viewTransitions: true, prefetch: { defaultStrategy: "hover" } }),
        ],
}));
