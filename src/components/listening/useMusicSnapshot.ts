import { useEffect, useState } from "react";

import { isMusicSnapshot, type MusicSnapshot } from "@satotek/blog-core/music";

export type MusicStatus = "loading" | "ready" | "error";

export function useMusicSnapshot() {
  const [snapshot, setSnapshot] = useState<MusicSnapshot | null>(null);
  const [status, setStatus] = useState<MusicStatus>("loading");

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
