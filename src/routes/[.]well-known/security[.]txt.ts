import { createFileRoute } from "@tanstack/react-router";

import { securityResponse } from "#/server/site-responses";

export const Route = createFileRoute("/.well-known/security.txt")({
  server: {
    handlers: {
      GET: () => securityResponse(),
    },
  },
});
