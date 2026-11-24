import { DeferredAnalytics } from "#/components/DeferredAnalytics";

// 初回は idle 後に GA を読み込み、以後はクライアント遷移ごとに page_view を送る。
export default function AnalyticsIsland() {
  return <DeferredAnalytics />;
}
