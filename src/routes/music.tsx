import { createFileRoute } from "@tanstack/react-router";

import { ListeningPage, useMusicSnapshot } from "#/components/listening";
import { createPageHead, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/music")({
  head: () =>
    createPageHead({
      title: withSiteName("音楽"),
      description: "Last.fm の再生記録。直近7日によく聴いた曲とアーティスト。",
      path: "/music",
    }),
  component: MusicPage,
});

function MusicPage() {
  const listening = useMusicSnapshot();
  return <ListeningPage snapshot={listening.snapshot} status={listening.status} />;
}
