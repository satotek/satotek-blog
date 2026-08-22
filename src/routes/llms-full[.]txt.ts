import { createFileRoute } from "@tanstack/react-router";

import { llmsFullResponse } from "#/server/site-responses";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: () => llmsFullResponse(),
    },
  },
});
