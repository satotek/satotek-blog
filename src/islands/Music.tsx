import { ListeningPage, useMusicSnapshot } from "#/components/listening";

// 再生記録は表示後に /api/music から取る。
export default function MusicIsland() {
  const listening = useMusicSnapshot();
  return <ListeningPage snapshot={listening.snapshot} status={listening.status} />;
}
