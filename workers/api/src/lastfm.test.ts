import { describe, expect, it } from "vite-plus/test";

import { getMusicFromLastfm, musicFromLastfmPayloads } from "./lastfm";

const artwork = "https://lastfm.freetls.fastly.net/i/u/300x300/abc.jpg";
const placeholder =
  "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png";

const recent = {
  recenttracks: {
    track: [
      {
        artist: { "#text": "Fishmans", mbid: "" },
        name: "ナイトクルージング",
        album: { "#text": "空中キャンプ" },
        url: "https://www.last.fm/music/Fishmans/_/Night",
        image: [
          { "#text": placeholder, size: "large" },
          { "#text": artwork, size: "extralarge" },
        ],
        "@attr": { nowplaying: "true" },
      },
      {
        artist: { "#text": "Lamp" },
        name: "最終列車は25時",
        album: { "#text": "" },
        url: "http://www.last.fm/music/Lamp/_/Train",
        date: { uts: "1710000000", "#text": "09 Mar 2024, 16:00" },
        image: [{ "#text": "", size: "large" }],
      },
      { artist: { "#text": "Missing" }, name: "" },
    ],
    "@attr": { total: "900", page: "1", perPage: "8", totalPages: "113" },
  },
};

const week = {
  recenttracks: {
    track: recent.recenttracks.track[1],
    "@attr": { total: "42", page: "1", perPage: "1", totalPages: "42" },
  },
};

const artists = {
  topartists: {
    artist: {
      name: "Fishmans",
      playcount: "11",
      url: "https://www.last.fm/music/Fishmans",
      image: [{ "#text": artwork, size: "extralarge" }],
    },
  },
};

const tracks = {
  toptracks: {
    track: [
      {
        name: "ナイトクルージング",
        playcount: "4",
        url: "https://www.last.fm/music/Fishmans/_/Night",
        artist: { name: "Fishmans", url: "https://www.last.fm/music/Fishmans" },
        image: [{ "#text": artwork, size: "large" }],
      },
    ],
  },
};

describe("Last.fm payloads", () => {
  it("keeps the now-playing track out of the recent list and drops placeholder art", () => {
    const snapshot = musicFromLastfmPayloads({
      user: "nosuke",
      recent,
      week,
      artists,
      tracks,
    });

    expect(snapshot).toMatchObject({
      source: "lastfm",
      user: "nosuke",
      profileUrl: "https://www.last.fm/user/nosuke",
      range: "7d",
      playcount: 42,
      nowPlaying: {
        name: "ナイトクルージング",
        artist: "Fishmans",
        album: "空中キャンプ",
        image: artwork,
        playedAt: null,
        url: "https://www.last.fm/music/Fishmans/_/Night",
      },
      recent: [
        {
          name: "最終列車は25時",
          artist: "Lamp",
          album: null,
          image: null,
          url: null,
          playedAt: "2024-03-09T16:00:00.000Z",
        },
      ],
      topArtists: [{ name: "Fishmans", playcount: 11, image: artwork }],
      topTracks: [{ name: "ナイトクルージング", artist: "Fishmans", playcount: 4, image: artwork }],
    });
  });

  it("stays available when only the chart calls fail", () => {
    const snapshot = musicFromLastfmPayloads({
      user: "nosuke",
      recent,
      week: { error: 16, message: "temporary" },
      artists: { error: 29, message: "rate limit" },
      tracks: null,
    });

    expect(snapshot.source).toBe("lastfm");
    expect(snapshot.playcount).toBeNull();
    expect(snapshot.topArtists).toEqual([]);
    expect(snapshot.topTracks).toEqual([]);
    expect(snapshot.nowPlaying?.name).toBe("ナイトクルージング");
  });
});

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof URL) return input.href;
  if (typeof input === "string") return input;
  return input.url;
}

describe("Last.fm client", () => {
  it("does not call Last.fm without an API key", async () => {
    let called = false;
    const snapshot = await getMusicFromLastfm({}, async () => {
      called = true;
      return new Response("{}");
    });

    expect(called).toBe(false);
    expect(snapshot.source).toBe("unavailable");
  });

  it("reads nosuke912 when no username is configured", async () => {
    let user = "";
    await getMusicFromLastfm({ LASTFM_API_KEY: "secret-key" }, async (input) => {
      user = new URL(requestUrl(input)).searchParams.get("user") ?? "";
      return Response.json({ error: 10, message: "stop" });
    });

    expect(user).toBe("nosuke912");
  });

  it("requests the four read methods and leaves the API key out of the snapshot", async () => {
    const methods: string[] = [];
    const snapshot = await getMusicFromLastfm(
      { LASTFM_API_KEY: "secret-key", LASTFM_USERNAME: "nosuke" },
      async (input) => {
        const url = new URL(requestUrl(input));
        expect(url.searchParams.get("api_key")).toBe("secret-key");
        expect(url.searchParams.get("user")).toBe("nosuke");
        const method = url.searchParams.get("method") ?? "";
        methods.push(method);
        if (method === "user.getrecenttracks" && url.searchParams.get("from")) {
          return Response.json(week);
        }
        if (method === "user.getrecenttracks") return Response.json(recent);
        if (method === "user.gettopartists") return Response.json(artists);
        if (method === "user.gettoptracks") return Response.json(tracks);
        return new Response("nope", { status: 500 });
      },
    );

    expect(methods.sort()).toEqual([
      "user.getrecenttracks",
      "user.getrecenttracks",
      "user.gettopartists",
      "user.gettoptracks",
    ]);
    expect(snapshot.playcount).toBe(42);
    expect(JSON.stringify(snapshot)).not.toContain("secret-key");
  });

  it("reports listening as unavailable when every Last.fm call fails", async () => {
    const snapshot = await getMusicFromLastfm(
      { LASTFM_API_KEY: "secret-key", LASTFM_USERNAME: "nosuke" },
      async () => Response.json({ error: 10, message: "Invalid API key" }),
    );

    expect(snapshot.source).toBe("unavailable");
    expect(snapshot.user).toBeNull();
  });
});
