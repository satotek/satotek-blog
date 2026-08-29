import { useEffect } from "react";

import { GA_MEASUREMENT_ID, loadGoogleAnalytics } from "#/analytics/client";
import { scheduleAfterIdle } from "#/lib/idle";

/** GA4 は本文の初期表示後に読み込み、ページビューは dataLayer へ取りこぼさず積む。 */
export function DeferredAnalytics() {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const cancel = scheduleAfterIdle(() => {
      void loadGoogleAnalytics().catch((error: unknown) => {
        console.warn("[analytics] Could not load Google Analytics.", error);
      });
    });

    return cancel;
  }, []);

  return null;
}
