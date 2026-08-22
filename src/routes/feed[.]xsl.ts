import { createFileRoute } from "@tanstack/react-router";

import { feedStylesheetResponse } from "#/server/site-responses";

export const Route = createFileRoute("/feed.xsl")({
  server: {
    handlers: {
      GET: () => feedStylesheetResponse(),
    },
  },
});
