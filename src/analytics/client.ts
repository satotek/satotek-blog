const configuredMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

/**
 * Production GA4 measurement ID, inlined at build time from
 * VITE_GA_MEASUREMENT_ID. Leave unset only for local deploys without gtag.
 */
export const GA_MEASUREMENT_ID =
  configuredMeasurementId && /^G-[A-Z0-9]+$/i.test(configuredMeasurementId)
    ? configuredMeasurementId
    : undefined;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let googleAnalyticsLoad: Promise<void> | undefined;

export function loadGoogleAnalytics() {
  if (typeof document === "undefined" || !GA_MEASUREMENT_ID) return Promise.resolve();
  if (googleAnalyticsLoad) return googleAnalyticsLoad;
  if (window.gtag) return Promise.resolve();

  window.dataLayer = window.dataLayer ?? [];
  const gtag: Gtag = function () {
    window.dataLayer?.push(arguments);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  // 初期マウント時は SiteChrome の effect より後にここへ到達するため、
  // gtag のスタブを作った直後に現在のページビューを積む。
  trackPageView(window.location.pathname);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.dataset.siteAnalytics = "google-analytics";

  googleAnalyticsLoad = new Promise<void>((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Analytics script failed to load.")),
      { once: true },
    );
    document.head.append(script);
  }).catch((error: unknown) => {
    googleAnalyticsLoad = undefined;
    window.gtag = undefined;
    throw error;
  });

  return googleAnalyticsLoad;
}

export function trackPageView(pathname: string) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}
