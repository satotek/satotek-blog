import { describe, expect, it } from "vite-plus/test";

import { activityFromEvents, getGithubActivity } from "./github";

const events = [
  {
    type: "PushEvent",
    created_at: "2026-10-24T03:00:00Z",
    repo: { name: "satotek/satotek-blog" },
    payload: { ref: "refs/heads/main", head: "abc123" },
  },
  {
    type: "PushEvent",
    created_at: "2026-10-24T02:00:00Z",
    repo: { name: "satotek/satotek-blog" },
    payload: { ref: "refs/heads/main", head: "def456", size: 2 },
  },
  {
    type: "PullRequestEvent",
    created_at: "2026-10-24T01:00:00Z",
    repo: { name: "satotek/satotek-blog" },
    payload: {
      action: "closed",
      number: 9,
      pull_request: { number: 9, merged: true, title: "ヘッダーを整える" },
    },
  },
  {
    type: "PullRequestEvent",
    created_at: "2026-10-23T12:00:00Z",
    repo: { name: "satotek/dotfiles" },
    payload: { action: "labeled", number: 3, pull_request: { number: 3 } },
  },
  {
    type: "WatchEvent",
    created_at: "2026-10-23T10:00:00Z",
    repo: { name: "oven-sh/bun" },
    payload: { action: "started" },
  },
  {
    type: "CreateEvent",
    created_at: "2026-10-23T09:00:00Z",
    repo: { name: "satotek/satotek-blog" },
    payload: { ref_type: "branch", ref: "feature" },
  },
];

describe("GitHub activity", () => {
  it("summarizes public events and folds consecutive pushes to one repo", () => {
    expect(activityFromEvents(events)).toEqual([
      {
        kind: "push",
        repo: "satotek/satotek-blog",
        repoUrl: "https://github.com/satotek/satotek-blog",
        summary: "main に push",
        url: "https://github.com/satotek/satotek-blog/commit/abc123",
        at: "2026-10-24T03:00:00Z",
      },
      {
        kind: "pull_request",
        repo: "satotek/satotek-blog",
        repoUrl: "https://github.com/satotek/satotek-blog",
        summary: "PR #9「ヘッダーを整える」をマージ",
        url: "https://github.com/satotek/satotek-blog/pull/9",
        at: "2026-10-24T01:00:00Z",
      },
      {
        kind: "star",
        repo: "oven-sh/bun",
        repoUrl: "https://github.com/oven-sh/bun",
        summary: "Star を付けた",
        url: "https://github.com/oven-sh/bun",
        at: "2026-10-23T10:00:00Z",
      },
    ]);
  });

  it("reads the user's public events and reports failures as unavailable", async () => {
    const requested: string[] = [];
    const ok = await getGithubActivity({ GITHUB_USERNAME: "someone" }, async (input) => {
      requested.push(input instanceof Request ? input.url : input.toString());
      return Response.json(events);
    });
    const failed = await getGithubActivity({}, async () => new Response("", { status: 403 }));

    expect(requested).toEqual(["https://api.github.com/users/someone/events/public?per_page=50"]);
    expect(ok).toMatchObject({
      source: "github",
      user: "someone",
      profileUrl: "https://github.com/someone",
    });
    expect(failed.source).toBe("unavailable");
  });
});
