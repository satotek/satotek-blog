import { createFileRoute } from "@tanstack/react-router";

import { llmsResponse } from "#/server/site-responses";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => llmsResponse(),
    },
  },
});
