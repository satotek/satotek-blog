import { createServerFn } from "@tanstack/react-start";

import { getPopularPostsFromGa4 } from "./ga4.server";

export const getPopularPosts = createServerFn({ method: "GET" }).handler(() =>
  getPopularPostsFromGa4(),
);
