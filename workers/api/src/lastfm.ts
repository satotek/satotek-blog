import {
  unavailableMusic,
  type MusicArtist,
  type MusicChartTrack,
  type MusicSnapshot,
  type MusicTrack,
} from "../../../src/lib/music";

export type LastfmEnv = {
  LASTFM_API_KEY?: string;
  LASTFM_USERNAME?: string;
};

const LASTFM_API = "https://ws.audioscrobbler.com/2.0/";
const DEFAULT_LASTFM_USERNAME = "nosuke912";
const USER_AGENT = "satotek.dev (https://satotek.dev)";
const REQUEST_TIMEOUT_MS = 5_000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;
const RECENT_LIMIT = 8;
const ARTIST_LIMIT = 6;
const TRACK_LIMIT = 8;
const MISSING_IMAGE = "2a96cbd8b46e442fc41c2b86b821562f";

type LastfmImage = {
  "#text"?: string;
  size?: string;
};

export async function getMusicFromLastfm(
  env: LastfmEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<MusicSnapshot> {
  const apiKey = env.LASTFM_API_KEY?.trim();
  const user = env.LASTFM_USERNAME?.trim() || DEFAULT_LASTFM_USERNAME;
  if (!apiKey) return unavailableMusic();

  // Last.fm の period=7day は暦週ではなく直近7日。再生回数も同じ窓に揃える。
  const weekStart = Math.floor(Date.now() / 1000) - WEEK_SECONDS;
  const [recent, week, artists, tracks] = await Promise.all([
    readLastfm(
      fetchImpl,
      lastfmUrl(apiKey, {
        method: "user.getrecenttracks",
        user,
        limit: String(RECENT_LIMIT),
      }),
    ),
    readLastfm(
      fetchImpl,
      lastfmUrl(apiKey, {
        method: "user.getrecenttracks",
        user,
        limit: "1",
        from: String(weekStart),
      }),
    ),
    readLastfm(
      fetchImpl,
      lastfmUrl(apiKey, {
        method: "user.gettopartists",
        user,
        period: "7day",
        limit: String(ARTIST_LIMIT),
      }),
    ),
    readLastfm(
      fetchImpl,
      lastfmUrl(apiKey, {
        method: "user.gettoptracks",
        user,
        period: "7day",
        limit: String(TRACK_LIMIT),
      }),
    ),
  ]);

  if (![recent, week, artists, tracks].some(isLastfmPayload)) return unavailableMusic();

  return musicFromLastfmPayloads({ user, recent, week, artists, tracks });
}

export function musicFromLastfmPayloads({
  user,
  recent,
  week,
  artists,
  tracks,
}: {
  user: string;
  recent: unknown;
  week: unknown;
  artists: unknown;
  tracks: unknown;
}): MusicSnapshot {
  const recentTracks = tracksFromPayload(recent);
  const nowPlaying = recentTracks.find((track) => track.nowPlaying)?.track ?? null;

  return {
    source: "lastfm",
    user,
    profileUrl: `https://www.last.fm/user/${encodeURIComponent(user)}`,
    range: "7d",
    playcount: totalFromPayload(week),
    nowPlaying,
    recent: recentTracks
      .filter((track) => !track.nowPlaying)
      .map((track) => track.track)
      .slice(0, RECENT_LIMIT),
    topArtists: artistsFromPayload(artists).slice(0, ARTIST_LIMIT),
    topTracks: chartTracksFromPayload(tracks).slice(0, TRACK_LIMIT),
  };
}

function lastfmUrl(apiKey: string, params: Record<string, string>) {
  const url = new URL(LASTFM_API);
  url.searchParams.set("format", "json");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("api_key", apiKey);
  return url;
}

async function readLastfm(fetchImpl: typeof fetch, url: URL): Promise<unknown> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // 失敗理由にリクエスト URL が含まれると API キーがログへ出る。
    console.error("[api] last.fm request failed");
    return null;
  }
}

function isLastfmPayload(payload: unknown) {
  return Boolean(payload && typeof payload === "object" && !("error" in payload));
}

function tracksFromPayload(payload: unknown) {
  return asList(record(payload)?.recenttracks)
    .flatMap((recent) => asList(record(recent)?.track))
    .flatMap((track) => {
      const parsed = trackFromRecord(track, false);
      return parsed ? [{ nowPlaying: isNowPlaying(track), track: parsed }] : [];
    });
}

function chartTracksFromPayload(payload: unknown): MusicChartTrack[] {
  return asList(record(payload)?.toptracks).flatMap((chart) =>
    asList(record(chart)?.track).flatMap((track) => {
      const parsed = trackFromRecord(track, true);
      const playcount = nonNegativeInt(record(track)?.playcount);
      return parsed && playcount !== null ? [{ ...parsed, playcount }] : [];
    }),
  );
}

function artistsFromPayload(payload: unknown): MusicArtist[] {
  return asList(record(payload)?.topartists).flatMap((chart) =>
    asList(record(chart)?.artist).flatMap((artist) => {
      const entry = record(artist);
      const name = namedText(entry?.name);
      const playcount = nonNegativeInt(entry?.playcount);
      if (!name || playcount === null) return [];
      return [
        {
          name,
          playcount,
          url: httpsUrl(namedText(entry?.url)),
          image: imageUrl(entry?.image),
        },
      ];
    }),
  );
}

function totalFromPayload(payload: unknown) {
  const recent = record(record(payload)?.recenttracks);
  return nonNegativeInt(record(recent?.["@attr"])?.total);
}

function trackFromRecord(value: unknown, chart: boolean): MusicTrack | null {
  const entry = record(value);
  const name = namedText(entry?.name);
  const artist = namedText(chart ? record(entry?.artist)?.name : entry?.artist);
  if (!name || !artist) return null;

  const album = namedText(entry?.album);
  const playedAt = unixTime(record(entry?.date)?.uts);

  return {
    name,
    artist,
    album: album || null,
    url: httpsUrl(namedText(entry?.url)),
    image: imageUrl(entry?.image),
    playedAt,
  };
}

function isNowPlaying(value: unknown) {
  const attr = record(record(value)?.["@attr"]);
  return attr?.nowplaying === "true" || attr?.nowplaying === true;
}

function imageUrl(value: unknown) {
  const images = asList(value).flatMap((image) => {
    const entry = image as LastfmImage;
    return entry && typeof entry === "object" ? [entry] : [];
  });
  for (const size of ["extralarge", "large", "medium", "small"]) {
    const url = httpsUrl(images.find((image) => image.size === size)?.["#text"] ?? "");
    if (url && !url.includes(MISSING_IMAGE)) return url;
  }
  return null;
}

function httpsUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function namedText(value: unknown) {
  if (typeof value === "string") return value.trim();
  const entry = record(value);
  if (typeof entry?.["#text"] === "string") return entry["#text"].trim();
  if (typeof entry?.name === "string") return entry.name.trim();
  return "";
}

function unixTime(value: unknown) {
  const seconds = nonNegativeInt(value);
  if (seconds === null) return null;
  return new Date(seconds * 1000).toISOString();
}

function nonNegativeInt(value: unknown) {
  if (typeof value === "boolean" || value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asList(value: unknown) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}
