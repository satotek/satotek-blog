import { createFileRoute } from "@tanstack/react-router";

import { feedResponse } from "#/server/site-responses";

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: () => feedResponse(),
    },
  },
});
