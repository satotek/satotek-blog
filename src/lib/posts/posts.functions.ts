import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { findPostBySlug } from "./posts.server";

export const getPostBySlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => findPostBySlug(data.slug));
