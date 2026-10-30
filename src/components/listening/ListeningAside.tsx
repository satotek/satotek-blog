import { RouterLink } from "#/components/ui";
import type { MusicSnapshot } from "@satotek/blog-core/music";

import { Artwork, Equalizer, TrackText } from "./parts";

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
        <Artwork image={track.image} label={track.name} className="size-10 rounded-xl" />
        <TrackText track={track} />
      </div>
    </section>
  );
}
