import { useEffect, useState } from "react";
import { fetch } from "void/client";

import { isMusicSnapshot, type MusicSnapshot } from "#/core/music";

export type MusicStatus = "loading" | "ready" | "error";

export function useMusicSnapshot() {
  const [snapshot, setSnapshot] = useState<MusicSnapshot | null>(null);
  const [status, setStatus] = useState<MusicStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/music")
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
