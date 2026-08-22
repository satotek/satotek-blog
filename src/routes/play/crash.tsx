import { createFileRoute } from "@tanstack/react-router";

// 隠しゲームの入口。意図的に 500 を発生させ、ルートの errorComponent
// （バグ退治）を出す。プリレンダからは vite.config.ts の filter で除外している。
export const Route = createFileRoute("/play/crash")({
  loader: () => {
    throw new Error("Intentional crash: enjoy the bug hunt.");
  },
  component: () => null,
});
