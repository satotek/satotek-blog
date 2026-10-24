export type MusicTrack = {
  name: string;
  artist: string;
  album: string | null;
  url: string | null;
  image: string | null;
  playedAt: string | null;
};

export type MusicArtist = {
  name: string;
  playcount: number;
  url: string | null;
  image: string | null;
};

export type MusicChartTrack = MusicTrack & {
  playcount: number;
};

/** ブラウザへ返す再生記録。API キーや Last.fm の生レスポンスは含めない。 */
export type MusicSnapshot = {
  source: "lastfm" | "unavailable";
  user: string | null;
  profileUrl: string | null;
  range: "7d";
  playcount: number | null;
  /** 記録を始めてからの総再生回数（Last.fm の scrobble 数）。 */
  scrobbles: number | null;
  nowPlaying: MusicTrack | null;
  recent: MusicTrack[];
  topArtists: MusicArtist[];
  topTracks: MusicChartTrack[];
};

export function unavailableMusic(): MusicSnapshot {
  return {
    source: "unavailable",
    user: null,
    profileUrl: null,
    range: "7d",
    playcount: null,
    scrobbles: null,
    nowPlaying: null,
    recent: [],
    topArtists: [],
    topTracks: [],
  };
}

export function isMusicSnapshot(value: unknown): value is MusicSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as MusicSnapshot;
  return (
    (snapshot.source === "lastfm" || snapshot.source === "unavailable") &&
    snapshot.range === "7d" &&
    Array.isArray(snapshot.recent) &&
    Array.isArray(snapshot.topArtists) &&
    Array.isArray(snapshot.topTracks)
  );
}
