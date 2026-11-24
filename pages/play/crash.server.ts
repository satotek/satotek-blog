import { defineHandler } from "void";

import { sharePage } from "../../src/page-context";

// 隠しゲームの入口。わざと例外を投げ、pages/_error の「バグ退治」を出す。
// 静的に書き出すとビルドが失敗するので、毎回 Worker で応答する。
export const prerender = false;

export const loader = defineHandler((c) => {
  sharePage(c);
  throw new Error("Intentional crash: enjoy the bug hunt.");
});
