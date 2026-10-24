import { createFileRoute, redirect } from "@tanstack/react-router";

/** タグの一覧は記事一覧の絞り込みに統合した。既存のリンクは記事一覧へ送る。 */
export const Route = createFileRoute("/tags/")({
  loader: () => {
    throw redirect({ to: "/posts", statusCode: 301, throw: true });
  },
});
