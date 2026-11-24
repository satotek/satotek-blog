import { useNavigation, useRouter } from "@void/react";
import { useEffect, useRef } from "react";

import { GA_MEASUREMENT_ID, loadGoogleAnalytics, trackPageView } from "#/analytics/client";
import { scheduleAfterIdle } from "#/lib/idle";

/**
 * GA4 は本文の初期表示後に読み込み、初回は dataLayer へ、以降は Void Router の
 * 遷移が確定するたびに現在のパスで page_view を送る。
 */
export function DeferredAnalytics() {
  const navigation = useNavigation();
  const router = useRouter();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const cancel = scheduleAfterIdle(() => {
      // loadGoogleAnalytics が同期的に gtag を準備して初期 page_view を積む。
      lastTrackedPathRef.current = window.location.pathname;
      void loadGoogleAnalytics().catch((error: unknown) => {
        lastTrackedPathRef.current = null;
        console.warn("[analytics] Could not load Google Analytics.", error);
      });
    });

    return cancel;
  }, []);

  useEffect(() => {
    // Void Router は commit 完了後（pushState と title 更新後）に state を idle へ戻す。
    // その時点で window.location.pathname と document.title が遷移後の値に揃う。
    if (!GA_MEASUREMENT_ID || navigation.state !== "idle" || !window.gtag) return;
    const pathname = window.location.pathname;
    if (pathname === lastTrackedPathRef.current) return;
    lastTrackedPathRef.current = pathname;
    trackPageView(pathname);
  }, [navigation.state, router.path]);

  return null;
}
