import { defineHandler, defineHead } from "void";

import { createPageHead, withSiteName } from "#/lib/site";
import { sharePage } from "../src/page-context";

export const loader = defineHandler((c) => {
  sharePage(c);
  return {};
});

export const head = defineHead(() =>
  createPageHead({
    title: withSiteName("音楽"),
    description: "Last.fm の再生記録。直近7日によく聴いた曲とアーティスト。",
    path: "/music",
  }),
);
