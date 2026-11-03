import { Disc3, History, Mic2, Music } from "lucide-react";
import type { ReactNode } from "react";
import { siLastdotfm } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { Link as AriaLink } from "#/components/ui";
import type { MusicSnapshot } from "@satotek/blog-core/music";

import { motionStyle } from "./motion";
import { ArtistTile, ChartTrack, CountStat, FeaturedTrack, RecentTrack } from "./tracks";
import type { MusicStatus } from "./useMusicSnapshot";

export function ListeningPage({
  snapshot,
  status,
}: {
  snapshot: MusicSnapshot | null;
  status: MusicStatus;
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

function ListeningBody({ snapshot }: { snapshot: MusicSnapshot }) {
  const featured = snapshot.nowPlaying ?? snapshot.recent[0] ?? null;
  const recent = snapshot.nowPlaying ? snapshot.recent : snapshot.recent.slice(1);
  const hasStats = snapshot.playcount !== null || snapshot.scrobbles !== null;

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
                <CountStat
                  count={snapshot.playcount}
                  label="回再生 / 直近7日"
                  tone="accent"
                  icon={<Music />}
                  index={1}
                  wide={snapshot.scrobbles === null}
                />
              ) : null}
              {snapshot.scrobbles !== null ? (
                <CountStat
                  count={snapshot.scrobbles}
                  label="総 scrobbles"
                  tone="ink"
                  icon={<Disc3 />}
                  index={2}
                  wide={snapshot.playcount === null}
                />
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
