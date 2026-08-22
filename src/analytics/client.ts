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

export const GA_INITIALIZER = GA_MEASUREMENT_ID
  ? `window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(Array.from(arguments)); };
window.gtag('js', new Date());
window.gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, { send_page_view: false });`
  : "";

export function trackPageView(pathname: string) {
  if (typeof window === "undefined" || !window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}
