import { defineHandler, defineHead } from "void";

import { withSiteName } from "#/lib/site";
import { sharePage } from "../src/page-context";

export const loader = defineHandler((c) => {
  sharePage(c);
  return {};
});

export const head = defineHead(() => ({ title: withSiteName("ページが見つかりません") }));
