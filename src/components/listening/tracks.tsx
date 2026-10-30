import type { ReactNode } from "react";

import { formatRelativeTime } from "#/lib/date";
import type { MusicArtist, MusicChartTrack, MusicTrack } from "@satotek/blog-core/music";

import { motionStyle, useCountUp } from "./motion";
import { Artwork, Equalizer, MaybeLink, TrackText } from "./parts";

export function FeaturedTrack({ track, live }: { track: MusicTrack; live: boolean }) {
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
          label={track.name}
          className="music-cover__art size-full rounded-2xl"
          eager
          textClassName="text-[2.6rem] sm:text-[3.2rem]"
        />
      </div>
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">
          {live ? <Equalizer /> : null}
          {live ? "Now playing" : "Last played"}
          {!live && track.playedAt ? (
            <time className="normal-case tracking-normal text-muted" dateTime={track.playedAt}>
              · {formatRelativeTime(track.playedAt)}
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

export function CountStat({
  count,
  label,
  tone,
  icon,
  index,
  wide,
}: {
  count: number;
  label: string;
  tone: "accent" | "ink";
  icon: ReactNode;
  index: number;
  wide: boolean;
}) {
  const shown = useCountUp(count);
  return (
    <section
      className={`music-stat music-stat--${tone} music-enter flex flex-col justify-between gap-6 p-5 ${wide ? "col-span-2 lg:col-span-1" : ""}`}
      aria-label={label}
      style={motionStyle(index)}
    >
      <span className="opacity-80 [&>svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="m-0 font-mono text-[2.1rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          <span aria-hidden="true">{shown.toLocaleString("ja-JP")}</span>
          <span className="sr-only">{count.toLocaleString("ja-JP")}回</span>
        </p>
        <p className="m-0 mt-1.5 text-[0.78rem] font-bold opacity-80" aria-hidden="true">
          {label}
        </p>
      </div>
    </section>
  );
}

export function ArtistTile({ artist, rank }: { artist: MusicArtist; rank: number }) {
  return (
    <MaybeLink
      className="music-row flex h-full flex-col items-center px-2 pb-3 pt-4 text-center no-underline hover:text-inherit sm:px-3 sm:pb-4 sm:pt-5"
      href={artist.url}
    >
      <span className="music-artist__ring relative rounded-full p-[3px]">
        <Artwork
          image={artist.image}
          label={artist.name}
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

export function ChartTrack({ track, rank }: { track: MusicChartTrack; rank: number }) {
  return (
    <MaybeLink className="music-row block no-underline hover:text-inherit" href={track.url}>
      <span className="music-row__bar" aria-hidden="true" />
      <span className="relative grid grid-cols-[22px_44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
        <span
          className={`text-center font-mono text-[0.85rem] font-semibold ${rank <= 3 ? "text-accent" : "text-muted"}`}
        >
          {rank}
        </span>
        <Artwork image={track.image} label={track.name} className="size-11 rounded-[10px]" />
        <TrackText track={track} />
        <span className="font-mono text-[0.74rem] font-semibold tabular-nums text-accent">
          {track.playcount.toLocaleString("ja-JP")} plays
        </span>
      </span>
    </MaybeLink>
  );
}

export function RecentTrack({ track }: { track: MusicTrack }) {
  return (
    <MaybeLink
      className="music-row grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 no-underline hover:text-inherit"
      href={track.url}
    >
      <Artwork image={track.image} label={track.name} className="size-11 rounded-[10px]" />
      <TrackText track={track} />
      {track.playedAt ? (
        <time className="font-mono text-[0.72rem] text-muted" dateTime={track.playedAt}>
          {formatRelativeTime(track.playedAt)}
        </time>
      ) : null}
    </MaybeLink>
  );
}
