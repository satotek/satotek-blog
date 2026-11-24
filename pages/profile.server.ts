import { defineHandler, defineHead } from "void";

import { createPageHead, withSiteName } from "#/lib/site";
import { sharePage } from "../src/page-context";

export const loader = defineHandler((c) => {
  sharePage(c);
  return {};
});

export const head = defineHead(() =>
  createPageHead({
    title: withSiteName("プロフィール"),
    description: "nosuke のプロフィール",
    path: "/profile",
    imageAlt: "satotek.dev のプロフィール",
  }),
);
