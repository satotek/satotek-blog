export type GithubActivityKind =
  | "push"
  | "pull_request"
  | "issue"
  | "release"
  | "create"
  | "star"
  | "fork";

export type GithubActivity = {
  kind: GithubActivityKind;
  /** owner/name */
  repo: string;
  repoUrl: string;
  /** 「main に 3 件 push」のような一行。 */
  summary: string;
  url: string;
  at: string;
};

/** ブラウザへ返す GitHub の最近の活動。トークンや生のイベントは含めない。 */
export type GithubSnapshot = {
  source: "github" | "unavailable";
  user: string | null;
  profileUrl: string | null;
  activity: GithubActivity[];
};

export function unavailableGithub(): GithubSnapshot {
  return { source: "unavailable", user: null, profileUrl: null, activity: [] };
}

export function isGithubSnapshot(value: unknown): value is GithubSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as GithubSnapshot;
  return (
    (snapshot.source === "github" || snapshot.source === "unavailable") &&
    Array.isArray(snapshot.activity)
  );
}
