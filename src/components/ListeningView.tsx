import { Music } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { siLastdotfm } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { Link as AriaLink, RouterLink } from "#/components/ui";
import {
  isMusicSnapshot,
  type MusicArtist,
  type MusicSnapshot,
  type MusicTrack,
} from "#/lib/music";

export function useMusicSnapshot() {
  const [snapshot, setSnapshot] = useState<MusicSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/music")
      .then(async (response) => {
        if (!response.ok) throw new Error("music request failed");
        return (await response.json()) as unknown;
      })
      .then((body) => {
        if (cancelled) return;
        if (!isMusicSnapshot(body)) {
          setStatus("error");
          return;
        }
        setSnapshot(body);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { snapshot, status };
}

export function ListeningPage({
  snapshot,
  status,
}: {
  snapshot: MusicSnapshot | null;
  status: "loading" | "ready" | "error";
}) {
  return (
    <section>
      <header className="mb-6 mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-accent">
            Listening
          </p>
          <h1 className="m-0 mt-1 text-[1.7rem] font-bold tracking-[-0.03em]">音楽</h1>
          <p className="m-0 mt-1 text-[0.9rem] text-muted">直近7日の再生記録</p>
        </div>
        {snapshot?.profileUrl ? (
          <AriaLink
            className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[0.82rem] font-semibold text-muted no-underline transition-colors duration-150 hover:border-accent-border hover:text-accent"
            href={snapshot.profileUrl}
            target="_blank"
            rel="noreferrer"
          >
            <BrandIcon icon={siLastdotfm} className="size-4" />
            Last.fm
          </AriaLink>
        ) : null}
      </header>

      {status === "loading" ? <ListeningSkeleton /> : null}
      {status !== "loading" && (status === "error" || snapshot?.source === "unavailable") ? (
        <p className="panel px-5 py-8 text-center text-muted">再生記録を読み込めませんでした。</p>
      ) : null}
      {status === "ready" && snapshot?.source === "lastfm" ? (
        <ListeningBody snapshot={snapshot} />
      ) : null}
    </section>
  );
}

export function ListeningAside({ snapshot }: { snapshot: MusicSnapshot | null }) {
  const track = snapshot?.source === "lastfm" ? (snapshot.nowPlaying ?? snapshot.recent[0]) : null;
  if (!snapshot || !track) return null;

  return (
    <section className="panel p-5" aria-labelledby="listening-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="listening-title">
          {snapshot.nowPlaying ? "いま聴いている" : "最近聴いた"}
        </h2>
        <RouterLink
          className="text-[0.78rem] font-semibold text-accent no-underline hover:underline"
          to="/music"
        >
          音楽 →
        </RouterLink>
      </div>
      <TrackLine track={track} />
    </section>
  );
}

function ListeningBody({ snapshot }: { snapshot: MusicSnapshot }) {
  const featured = snapshot.nowPlaying ?? snapshot.recent[0] ?? null;
  const recent = snapshot.nowPlaying ? snapshot.recent : snapshot.recent.slice(1);
  const hasCharts = snapshot.topArtists.length > 0 || snapshot.topTracks.length > 0;
  const hasRecent = recent.length > 0;

  if (!featured && snapshot.playcount === null && !hasCharts) {
    return (
      <p className="panel px-5 py-8 text-center text-muted">この期間の再生記録はありません。</p>
    );
  }

  return (
    <div className="grid gap-3">
      {featured ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <FeaturedTrack track={featured} live={snapshot.nowPlaying !== null} />
          {snapshot.playcount !== null ? <Playcount count={snapshot.playcount} /> : null}
        </div>
      ) : snapshot.playcount !== null ? (
        <Playcount count={snapshot.playcount} />
      ) : null}

      {hasCharts ? (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {snapshot.topArtists.length > 0 ? (
            <section className="panel p-5" aria-labelledby="artists-title">
              <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="artists-title">
                アーティスト
              </h2>
              <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                {snapshot.topArtists.map((artist) => (
                  <li key={artist.name}>
                    <ArtistRow artist={artist} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {snapshot.topTracks.length > 0 ? (
            <section className="panel p-5" aria-labelledby="tracks-title">
              <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="tracks-title">
                曲
              </h2>
              <ol className="m-0 mt-3 grid list-none gap-0.5 p-0">
                {snapshot.topTracks.map((track, index) => (
                  <li key={`${track.artist}-${track.name}`}>
                    <ChartTrack track={track} rank={index + 1} />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}

      {hasRecent ? (
        <section className="panel p-5" aria-labelledby="recent-title">
          <h2 className="m-0 text-[0.78rem] font-bold text-muted" id="recent-title">
            最近再生した曲
          </h2>
          <ul className="m-0 mt-3 grid list-none gap-1 p-0">
            {recent.map((track) => (
              <li key={`${track.playedAt ?? "recent"}-${track.artist}-${track.name}`}>
                <TrackLine track={track} time={track.playedAt} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FeaturedTrack({ track, live }: { track: MusicTrack; live: boolean }) {
  return (
    <section className="panel flex gap-4 p-4 sm:p-5" aria-labelledby="featured-track">
      <Artwork image={track.image} size="lg" />
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 text-[0.78rem] font-bold text-accent">
          {live ? <LiveDot /> : null}
          {live ? "再生中" : "最後に聴いた"}
        </p>
        <h2
          className="m-0 mt-1 text-[1.15rem] font-bold leading-snug tracking-[-0.02em]"
          id="featured-track"
        >
          <MaybeLink href={track.url}>{track.name}</MaybeLink>
        </h2>
        <p className="m-0 mt-1 text-[0.95rem]">{track.artist}</p>
        {track.album ? <p className="m-0 mt-0.5 text-[0.85rem] text-muted">{track.album}</p> : null}
      </div>
    </section>
  );
}

function Playcount({ count }: { count: number }) {
  return (
    <section
      className="panel flex flex-col justify-center px-5 py-4"
      aria-label="直近7日の再生回数"
    >
      <p className="m-0 text-[0.78rem] font-bold text-muted">直近7日</p>
      <p className="m-0 mt-1 font-mono text-[2rem] font-semibold leading-none tracking-[-0.04em] text-accent">
        {count.toLocaleString("ja-JP")}
        <span className="ml-1 text-[0.9rem] font-bold text-muted">回</span>
      </p>
    </section>
  );
}

function ArtistRow({ artist }: { artist: MusicArtist }) {
  return (
    <MaybeLink
      className="flex items-center gap-3 rounded-[10px] px-2 py-2 no-underline hover:bg-hover"
      href={artist.url}
    >
      <Artwork image={artist.image} size="sm" round />
      <span className="min-w-0">
        <span className="block truncate text-[0.92rem] font-bold">{artist.name}</span>
        <span className="font-mono text-[0.74rem] tabular-nums text-muted">
          {artist.playcount.toLocaleString("ja-JP")}回
        </span>
      </span>
    </MaybeLink>
  );
}

function ChartTrack({ track, rank }: { track: MusicTrack & { playcount: number }; rank: number }) {
  return (
    <div
      className={`grid grid-cols-[26px_40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[10px] px-2 py-2 ${rank === 1 ? "bg-accent-soft" : ""}`}
    >
      <span
        className={`font-mono text-[0.95rem] font-semibold ${rank === 1 ? "text-accent" : "text-muted"}`}
      >
        {rank}
      </span>
      <Artwork image={track.image} size="xs" />
      <span className="min-w-0">
        <MaybeLink
          className="block truncate text-[0.9rem] font-bold no-underline hover:text-accent"
          href={track.url}
        >
          {track.name}
        </MaybeLink>
        <span className="block truncate text-[0.78rem] text-muted">{track.artist}</span>
      </span>
      <span className="font-mono text-[0.74rem] tabular-nums text-muted">
        {track.playcount.toLocaleString("ja-JP")}
      </span>
    </div>
  );
}

function TrackLine({ track, time }: { track: MusicTrack; time?: string | null }) {
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2">
      <Artwork image={track.image} size="xs" />
      <span className="min-w-0">
        <MaybeLink
          className="block truncate text-[0.9rem] font-bold no-underline hover:text-accent"
          href={track.url}
        >
          {track.name}
        </MaybeLink>
        <span className="block truncate text-[0.78rem] text-muted">{track.artist}</span>
      </span>
      {time ? (
        <time className="text-[0.75rem] text-muted" dateTime={time}>
          {formatPlayedAt(time)}
        </time>
      ) : null}
    </div>
  );
}

function Artwork({
  image,
  size,
  round = false,
}: {
  image: string | null;
  size: "lg" | "sm" | "xs";
  round?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const dimension = size === "lg" ? "size-24" : size === "sm" ? "size-11" : "size-10";
  const radius = round ? "rounded-full" : "rounded-xl";
  const showImage = image && !failed;

  return (
    <span
      className={`relative block shrink-0 overflow-hidden border border-line bg-accent-soft ${dimension} ${radius}`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          height={size === "lg" ? 96 : 40}
          loading={size === "lg" ? "eager" : "lazy"}
          src={image}
          width={size === "lg" ? 96 : 40}
          onError={() => setFailed(true)}
        />
      ) : (
        <Music className="absolute inset-0 m-auto size-4 text-accent" aria-hidden="true" />
      )}
    </span>
  );
}

function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <AriaLink className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </AriaLink>
  );
}

function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-accent" />
    </span>
  );
}

function ListeningSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      <p className="sr-only">読み込み中</p>
      <div className="panel h-32 animate-pulse bg-hover motion-reduce:animate-none" />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel h-48 animate-pulse bg-hover motion-reduce:animate-none" />
        <div className="panel h-48 animate-pulse bg-hover motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function formatPlayedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
