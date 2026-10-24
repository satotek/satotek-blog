import { Disc3, History, Mic2, Music } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { siLastdotfm } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { Link as AriaLink, RouterLink } from "#/components/ui";
import {
  isMusicSnapshot,
  type MusicArtist,
  type MusicChartTrack,
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
          <p className="m-0 mt-1 text-[0.9rem] text-muted">
            直近7日によく聴いた曲とアーティスト、最近の再生記録
          </p>
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
        <h2
          className="m-0 flex items-center gap-2 text-[0.78rem] font-bold text-muted"
          id="listening-title"
        >
          {snapshot.nowPlaying ? <Equalizer className="text-accent" /> : null}
          {snapshot.nowPlaying ? "いま聴いている" : "最近聴いた"}
        </h2>
        <RouterLink
          className="text-[0.78rem] font-semibold text-accent no-underline hover:underline"
          to="/music"
        >
          音楽 →
        </RouterLink>
      </div>
      <div className="mt-2 grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-2 py-2">
        <Artwork image={track.image} className="size-10 rounded-xl" />
        <TrackText track={track} />
      </div>
    </section>
  );
}

function ListeningBody({ snapshot }: { snapshot: MusicSnapshot }) {
  const featured = snapshot.nowPlaying ?? snapshot.recent[0] ?? null;
  const recent = snapshot.nowPlaying ? snapshot.recent : snapshot.recent.slice(1);
  const topArtist = snapshot.topArtists[0] ?? null;
  const hasStats = snapshot.playcount !== null || topArtist !== null;

  if (!featured && !hasStats && snapshot.topTracks.length === 0) {
    return (
      <p className="panel px-5 py-8 text-center text-muted">この期間の再生記録はありません。</p>
    );
  }

  return (
    <div className="grid gap-8">
      {featured || hasStats ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {featured ? <FeaturedTrack track={featured} live={snapshot.nowPlaying !== null} /> : null}
          {hasStats ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {snapshot.playcount !== null ? (
                <PlaycountStat count={snapshot.playcount} wide={!topArtist} />
              ) : null}
              {topArtist ? (
                <TopArtistStat artist={topArtist} wide={snapshot.playcount === null} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {snapshot.topArtists.length > 0 ? (
        <section aria-labelledby="artists-title">
          <SectionTitle id="artists-title" icon={<Mic2 />} meta="直近7日">
            よく聴いたアーティスト
          </SectionTitle>
          <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:gap-3 lg:grid-cols-6">
            {snapshot.topArtists.map((artist, index) => (
              <li
                className="music-enter"
                key={artist.name}
                style={motionStyle(index + 2, artist.playcount / snapshot.topArtists[0].playcount)}
              >
                <ArtistTile artist={artist} rank={index + 1} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {snapshot.topTracks.length > 0 || recent.length > 0 ? (
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-6">
          {snapshot.topTracks.length > 0 ? (
            <section aria-labelledby="tracks-title">
              <SectionTitle id="tracks-title" icon={<Disc3 />} meta="直近7日">
                よく聴いた曲
              </SectionTitle>
              <ol className="m-0 grid list-none gap-2 p-0">
                {snapshot.topTracks.map((track, index) => (
                  <li
                    className="music-slide"
                    key={`${track.artist}-${track.name}`}
                    style={motionStyle(index, track.playcount / snapshot.topTracks[0].playcount)}
                  >
                    <ChartTrack track={track} rank={index + 1} />
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {recent.length > 0 ? (
            <section aria-labelledby="recent-title">
              <SectionTitle id="recent-title" icon={<History />}>
                最近再生した曲
              </SectionTitle>
              <ul className="m-0 grid list-none gap-2 p-0">
                {recent.map((track, index) => (
                  <li
                    className="music-slide"
                    key={`${track.playedAt ?? "recent"}-${track.artist}-${track.name}`}
                    style={motionStyle(index)}
                  >
                    <RecentTrack track={track} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({
  id,
  icon,
  meta,
  children,
}: {
  id: string;
  icon: ReactNode;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="m-0 flex items-center gap-2 text-[0.95rem] font-bold" id={id}>
        <span
          className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent [&>svg]:size-3.5"
          aria-hidden="true"
        >
          {icon}
        </span>
        {children}
      </h2>
      {meta ? (
        <span className="font-mono text-[0.66rem] tracking-[0.06em] text-muted">{meta}</span>
      ) : null}
    </div>
  );
}

function FeaturedTrack({ track, live }: { track: MusicTrack; live: boolean }) {
  return (
    <section
      className="panel music-hero music-enter flex items-center gap-4 p-5 sm:gap-6 sm:p-7"
      aria-labelledby="featured-track"
      style={motionStyle(0)}
    >
      {track.image ? (
        <img alt="" aria-hidden="true" className="music-hero__backdrop" src={track.image} />
      ) : null}
      <div className="music-cover" data-live={live || undefined}>
        <span className="music-vinyl" aria-hidden="true" />
        <Artwork
          image={track.image}
          className="music-cover__art size-full rounded-2xl"
          eager
          iconClassName="size-8"
        />
      </div>
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">
          {live ? <Equalizer /> : null}
          {live ? "Now playing" : "Last played"}
          {!live && track.playedAt ? (
            <time className="normal-case tracking-normal text-muted" dateTime={track.playedAt}>
              · {formatPlayedAt(track.playedAt)}
            </time>
          ) : null}
        </p>
        <h2
          className="m-0 mt-1.5 line-clamp-2 text-[1.25rem] font-bold leading-snug tracking-[-0.02em] sm:text-[1.6rem]"
          id="featured-track"
        >
          <MaybeLink className="no-underline" href={track.url}>
            {track.name}
          </MaybeLink>
        </h2>
        <p className="m-0 mt-1 truncate text-[0.95rem] font-medium">{track.artist}</p>
        {track.album ? (
          <p className="m-0 mt-0.5 truncate text-[0.82rem] text-muted">{track.album}</p>
        ) : null}
      </div>
    </section>
  );
}

function PlaycountStat({ count, wide }: { count: number; wide: boolean }) {
  const shown = useCountUp(count);
  return (
    <section
      className={`music-stat music-stat--accent music-enter flex flex-col justify-between gap-6 p-5 ${wide ? "col-span-2 lg:col-span-1" : ""}`}
      aria-label="直近7日の再生回数"
      style={motionStyle(1)}
    >
      <Music className="size-5 opacity-80" aria-hidden="true" />
      <div>
        <p className="m-0 font-mono text-[2.1rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          <span aria-hidden="true">{shown.toLocaleString("ja-JP")}</span>
          <span className="sr-only">{count.toLocaleString("ja-JP")}回</span>
        </p>
        <p className="m-0 mt-1.5 text-[0.78rem] font-bold opacity-85">回再生 / 直近7日</p>
      </div>
    </section>
  );
}

function TopArtistStat({ artist, wide }: { artist: MusicArtist; wide: boolean }) {
  return (
    <section
      className={`music-stat music-stat--ink music-enter flex flex-col justify-between gap-6 p-5 ${wide ? "col-span-2 lg:col-span-1" : ""}`}
      aria-label="直近7日でいちばん聴いたアーティスト"
      style={motionStyle(2)}
    >
      <div className="flex items-center justify-between gap-3">
        <Mic2 className="size-5 opacity-80" aria-hidden="true" />
        <Artwork
          image={artist.image}
          className="size-9 rounded-full border-2 border-white/20"
          round
        />
      </div>
      <div className="min-w-0">
        <p className="m-0 truncate text-[1.3rem] font-bold leading-tight tracking-[-0.02em]">
          <MaybeLink className="no-underline hover:text-inherit" href={artist.url}>
            {artist.name}
          </MaybeLink>
        </p>
        <p className="m-0 mt-1.5 text-[0.78rem] font-bold opacity-70">
          いちばん聴いた · {artist.playcount.toLocaleString("ja-JP")}回
        </p>
      </div>
    </section>
  );
}

function ArtistTile({ artist, rank }: { artist: MusicArtist; rank: number }) {
  return (
    <MaybeLink
      className="music-row flex h-full flex-col items-center px-2 pb-3 pt-4 text-center no-underline hover:text-inherit sm:px-3 sm:pb-4 sm:pt-5"
      href={artist.url}
    >
      <span className="music-artist__ring relative rounded-full p-[3px]">
        <Artwork
          image={artist.image}
          className="size-14 rounded-full border-[3px] border-card sm:size-[72px]"
          round
        />
        <span
          className={`absolute -right-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-card font-mono text-[0.68rem] font-bold ${rank === 1 ? "bg-accent text-card" : "bg-hover text-muted"}`}
        >
          {rank}
        </span>
      </span>
      <span className="mt-2.5 block w-full truncate text-[0.82rem] font-bold sm:mt-3 sm:text-[0.9rem]">
        {artist.name}
      </span>
      <span className="font-mono text-[0.72rem] tabular-nums text-accent">
        {artist.playcount.toLocaleString("ja-JP")} plays
      </span>
    </MaybeLink>
  );
}

function ChartTrack({ track, rank }: { track: MusicChartTrack; rank: number }) {
  return (
    <MaybeLink className="music-row block no-underline hover:text-inherit" href={track.url}>
      <span className="music-row__bar" aria-hidden="true" />
      <span className="relative grid grid-cols-[22px_44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
        <span
          className={`text-center font-mono text-[0.85rem] font-semibold ${rank <= 3 ? "text-accent" : "text-muted"}`}
        >
          {rank}
        </span>
        <Artwork image={track.image} className="size-11 rounded-[10px]" />
        <TrackText track={track} />
        <span className="font-mono text-[0.74rem] font-semibold tabular-nums text-accent">
          {track.playcount.toLocaleString("ja-JP")} plays
        </span>
      </span>
    </MaybeLink>
  );
}

function RecentTrack({ track }: { track: MusicTrack }) {
  return (
    <MaybeLink
      className="music-row grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 no-underline hover:text-inherit"
      href={track.url}
    >
      <Artwork image={track.image} className="size-11 rounded-[10px]" />
      <TrackText track={track} />
      {track.playedAt ? (
        <time className="font-mono text-[0.72rem] text-muted" dateTime={track.playedAt}>
          {formatPlayedAt(track.playedAt)}
        </time>
      ) : null}
    </MaybeLink>
  );
}

function TrackText({ track }: { track: MusicTrack }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[0.9rem] font-bold">{track.name}</span>
      <span className="block truncate text-[0.78rem] text-muted">{track.artist}</span>
    </span>
  );
}

function Artwork({
  image,
  className,
  round = false,
  eager = false,
  iconClassName = "size-4",
}: {
  image: string | null;
  className: string;
  round?: boolean;
  eager?: boolean;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;

  return (
    <span
      className={`music-art relative block shrink-0 overflow-hidden ${round ? "" : "border border-line"} ${className}`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          height={eager ? 136 : 72}
          loading={eager ? "eager" : "lazy"}
          src={image}
          width={eager ? 136 : 72}
          onError={() => setFailed(true)}
        />
      ) : (
        <Music
          className={`absolute inset-0 m-auto text-accent ${iconClassName}`}
          aria-hidden="true"
        />
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

function Equalizer({ className = "" }: { className?: string }) {
  return (
    <span className={`music-eq ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function ListeningSkeleton() {
  const block = "animate-pulse bg-hover motion-reduce:animate-none";
  return (
    <div className="grid gap-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">読み込み中</p>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={`panel h-44 sm:h-48 ${block}`} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className={`h-32 rounded-[18px] lg:h-auto ${block}`} />
          <div className={`h-32 rounded-[18px] lg:h-auto ${block}`} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div className={`h-32 rounded-[14px] sm:h-40 ${block}`} key={index} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, column) => (
          <div className="grid gap-2" key={column}>
            {Array.from({ length: 4 }, (_, index) => (
              <div className={`h-16 rounded-[14px] ${block}`} key={index} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 入場アニメーションの順番（--i）と、再生回数の割合（--share, 0〜1）を CSS へ渡す。 */
function motionStyle(index: number, share?: number) {
  return { "--i": index, "--share": share } as CSSProperties;
}

/** 数字を 0 から数え上げる。動きを減らす設定では最初から最終値を出す。 */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
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
