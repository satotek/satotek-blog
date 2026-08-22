import { createFileRoute } from "@tanstack/react-router";

import { robotsResponse } from "#/server/site-responses";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => robotsResponse(),
    },
  },
});
