import {
  unavailableGithub,
  type GithubActivity,
  type GithubSnapshot,
} from "@satotek/blog-core/github";

export type GithubEnv = {
  /** 未設定でも公開イベントは読める。設定すると取得上限が 60 回/時から上がる。 */
  GITHUB_TOKEN?: string;
  GITHUB_USERNAME?: string;
};

const GITHUB_API = "https://api.github.com";
const DEFAULT_GITHUB_USERNAME = "satotek";
const USER_AGENT = "satotek.dev (https://satotek.dev)";
const REQUEST_TIMEOUT_MS = 5_000;
const EVENT_PAGE_SIZE = 50;
const ACTIVITY_LIMIT = 8;

type GithubEvent = {
  type?: string;
  created_at?: string;
  repo?: { name?: string };
  payload?: Record<string, unknown>;
};

export async function getGithubActivity(
  env: GithubEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<GithubSnapshot> {
  const user = env.GITHUB_USERNAME?.trim() || DEFAULT_GITHUB_USERNAME;
  const token = env.GITHUB_TOKEN?.trim();

  const response = await fetchImpl(
    `${GITHUB_API}/users/${encodeURIComponent(user)}/events/public?per_page=${EVENT_PAGE_SIZE}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": USER_AGENT,
        "x-github-api-version": "2022-11-28",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    console.warn("[github] events request returned", response.status);
    return unavailableGithub();
  }

  const events = (await response.json()) as unknown;
  if (!Array.isArray(events)) return unavailableGithub();

  return {
    source: "github",
    user,
    profileUrl: `https://github.com/${encodeURIComponent(user)}`,
    activity: activityFromEvents(events as GithubEvent[]),
  };
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function branchName(ref: unknown) {
  return text(ref)?.replace(/^refs\/(heads|tags)\//, "");
}

function describe(
  event: GithubEvent,
  repoUrl: string,
): Omit<GithubActivity, "repo" | "repoUrl" | "at"> | undefined {
  const payload = event.payload ?? {};

  switch (event.type) {
    case "PushEvent": {
      const branch = branchName(payload.ref) ?? "default branch";
      // 2025 年以降の公開イベントは commits と size を省くことがある。
      const size = typeof payload.size === "number" ? payload.size : undefined;
      const head = text(payload.head);
      return {
        kind: "push",
        summary: size ? `${branch} に ${size} 件 push` : `${branch} に push`,
        url: head ? `${repoUrl}/commit/${head}` : `${repoUrl}/tree/${encodeURIComponent(branch)}`,
      };
    }
    case "PullRequestEvent": {
      const pull = record(payload.pull_request);
      const number = typeof pull?.number === "number" ? pull.number : payload.number;
      const action = text(payload.action);
      const merged = pull?.merged === true;
      const verb =
        action === "opened"
          ? "を作成"
          : action === "closed"
            ? merged
              ? "をマージ"
              : "を閉じた"
            : action === "reopened"
              ? "を再開"
              : undefined;
      if (!verb || typeof number !== "number") return undefined;
      const title = text(pull?.title);
      return {
        kind: "pull_request",
        summary: `PR #${number}${title ? `「${title}」` : ""}${verb}`,
        url: text(pull?.html_url) ?? `${repoUrl}/pull/${number}`,
      };
    }
    case "IssuesEvent": {
      const issue = record(payload.issue);
      const action = text(payload.action);
      const verb = action === "opened" ? "を作成" : action === "closed" ? "を閉じた" : undefined;
      if (!verb || typeof issue?.number !== "number") return undefined;
      const title = text(issue.title);
      return {
        kind: "issue",
        summary: `Issue #${issue.number}${title ? `「${title}」` : ""}${verb}`,
        url: text(issue.html_url) ?? `${repoUrl}/issues/${issue.number}`,
      };
    }
    case "ReleaseEvent": {
      const release = record(payload.release);
      if (text(payload.action) !== "published" || !release) return undefined;
      const name = text(release.name) ?? text(release.tag_name);
      return {
        kind: "release",
        summary: name ? `${name} をリリース` : "リリースを公開",
        url: text(release.html_url) ?? `${repoUrl}/releases`,
      };
    }
    case "CreateEvent": {
      if (payload.ref_type !== "repository") return undefined;
      return { kind: "create", summary: "リポジトリを作成", url: repoUrl };
    }
    case "WatchEvent":
      return { kind: "star", summary: "Star を付けた", url: repoUrl };
    case "ForkEvent": {
      const forkee = record(payload.forkee);
      return {
        kind: "fork",
        summary: "フォークした",
        url: text(forkee?.html_url) ?? repoUrl,
      };
    }
    default:
      return undefined;
  }
}

/**
 * 公開イベントを一覧向けの行にする。同じリポジトリへの続けての push は
 * 最新の 1 行にまとめ、push ばかりで他の活動が流れないようにする。
 */
export function activityFromEvents(events: readonly GithubEvent[]): GithubActivity[] {
  const activity: GithubActivity[] = [];

  for (const event of events) {
    const repo = text(event.repo?.name);
    const at = text(event.created_at);
    if (!repo || !at) continue;

    const repoUrl = `https://github.com/${repo}`;
    const described = describe(event, repoUrl);
    if (!described) continue;

    const previous = activity.at(-1);
    if (described.kind === "push" && previous?.kind === "push" && previous.repo === repo) {
      continue;
    }

    activity.push({ ...described, repo, repoUrl, at });
    if (activity.length >= ACTIVITY_LIMIT) break;
  }

  return activity;
}
