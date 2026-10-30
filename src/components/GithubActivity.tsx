import {
  GitFork,
  GitMerge,
  GitPullRequest,
  CircleDot,
  FolderPlus,
  Star,
  Tag,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { siGithub } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { SectionHeading } from "#/components/SectionHeading";
import { Link as AriaLink } from "#/components/ui";
import { formatRelativeTime } from "#/lib/date";
import {
  isGithubSnapshot,
  type GithubActivity as Activity,
  type GithubActivityKind,
  type GithubSnapshot,
} from "@satotek/blog-core/github";

const kindIcons: Record<GithubActivityKind, LucideIcon> = {
  push: Upload,
  pull_request: GitPullRequest,
  issue: CircleDot,
  release: Tag,
  create: FolderPlus,
  star: Star,
  fork: GitFork,
};

function useGithubSnapshot() {
  const [snapshot, setSnapshot] = useState<GithubSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/github")
      .then(async (response) => (response.ok ? ((await response.json()) as unknown) : null))
      .then((body) => {
        if (!cancelled && isGithubSnapshot(body)) setSnapshot(body);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return snapshot;
}

/**
 * プロフィールの「最近の GitHub」。公開イベントは API Worker が読んで 10 分キャッシュする。
 * 取れないとき、活動が無いときは節ごと出さない。
 */
export function GithubActivity() {
  const snapshot = useGithubSnapshot();
  if (!snapshot || snapshot.source !== "github" || snapshot.activity.length === 0) return null;

  return (
    <section aria-labelledby="github-title">
      <SectionHeading
        title="GitHub"
        id="github-title"
        description="公開リポジトリでの最近の活動です。"
        action={
          snapshot.profileUrl ? (
            <AriaLink
              className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-accent no-underline hover:underline"
              href={snapshot.profileUrl}
              target="_blank"
              rel="noreferrer"
            >
              <BrandIcon icon={siGithub} className="size-3.5" />
              {snapshot.user}
            </AriaLink>
          ) : undefined
        }
      />
      <ol
        className="panel rise-enter m-0 grid list-none gap-0 p-0"
        style={{ "--i": 0 } as CSSProperties}
      >
        {snapshot.activity.map((activity, index) => (
          <ActivityRow activity={activity} key={`${activity.at}-${index}`} />
        ))}
      </ol>
    </section>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const Icon =
    activity.kind === "pull_request" && activity.summary.endsWith("をマージ")
      ? GitMerge
      : kindIcons[activity.kind];

  return (
    <li className="border-b border-line last:border-b-0">
      <AriaLink
        className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-ink no-underline transition-colors hover:bg-hover"
        href={activity.url}
        target="_blank"
        rel="noreferrer"
      >
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.9rem] font-semibold">{activity.summary}</span>
          <span className="block truncate font-mono text-[0.75rem] text-muted">
            {activity.repo}
          </span>
        </span>
        <time className="text-[0.78rem] tabular-nums text-muted" dateTime={activity.at}>
          {formatRelativeTime(activity.at)}
        </time>
      </AriaLink>
    </li>
  );
}
