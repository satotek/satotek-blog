import { DeferredAnalytics } from "#/components/DeferredAnalytics";

// 全画面遷移なので、読み込みごとに loadGoogleAnalytics が現在のページビューを積む。
export default function AnalyticsIsland() {
  return <DeferredAnalytics />;
}
