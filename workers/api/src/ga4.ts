import { aggregatePopularPosts, postPathToSlug } from "../../../src/analytics/popular-posts";
import type { PopularPost } from "../../../src/analytics/types";

export type Ga4Env = {
  GA4_PROPERTY_ID?: string;
  GA4_CLIENT_EMAIL?: string;
  GA4_PRIVATE_KEY?: string;
};

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ANALYTICS_DATA_URL = "https://analyticsdata.googleapis.com/v1beta";
const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const POPULAR_POST_LIMIT = 10;
const GOOGLE_REQUEST_TIMEOUT_MS = 5_000;

type Ga4Configuration = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

type OAuthTokenResponse = {
  access_token?: string;
};

type Ga4ReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type Ga4ReportResponse = {
  rows?: Ga4ReportRow[];
};

function getConfiguration(env: Ga4Env): Ga4Configuration | undefined {
  const propertyId = env.GA4_PROPERTY_ID?.trim();
  const clientEmail = env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = env.GA4_PRIVATE_KEY?.trim();

  if (!propertyId || !clientEmail || !privateKey) return undefined;

  return { propertyId, clientEmail, privateKey };
}

function encodeBase64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePrivateKey(pem: string) {
  const base64 = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return bytes.buffer;
}

async function createServiceAccountAssertion(configuration: Ga4Configuration) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      iss: configuration.clientEmail,
      scope: GOOGLE_ANALYTICS_SCOPE,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3_600,
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodePrivateKey(configuration.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${encodeBase64Url(signature)}`;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google Analytics API returned ${response.status}`);
  }

  return (await response.json()) as T;
}

async function getAccessToken(configuration: Ga4Configuration) {
  const assertion = await createServiceAccountAssertion(configuration);
  const response = await fetchJson<OAuthTokenResponse>(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.access_token) {
    throw new Error("Google OAuth did not return an access token");
  }

  return response.access_token;
}

async function runPopularPostsReport(
  configuration: Ga4Configuration,
  accessToken: string,
): Promise<readonly PopularPost[]> {
  const response = await fetchJson<Ga4ReportResponse>(
    `${GOOGLE_ANALYTICS_DATA_URL}/properties/${encodeURIComponent(configuration.propertyId)}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              value: "^/posts/[^/]+/?$",
              matchType: "FULL_REGEXP",
            },
          },
        },
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: String(POPULAR_POST_LIMIT),
      }),
    },
  );

  const reportPosts = (response.rows ?? []).flatMap((row) => {
    const path = row.dimensionValues?.[0]?.value;
    const slug = path ? postPathToSlug(path) : undefined;
    const views = Number(row.metricValues?.[0]?.value ?? 0);

    if (!path || !slug || !Number.isFinite(views)) return [];

    return [
      {
        slug,
        title: row.dimensionValues?.[1]?.value ?? "",
        path,
        views,
      },
    ];
  });

  return aggregatePopularPosts(reportPosts);
}

/**
 * 直近7日の記事パスを GA4 から読む。資格情報が無い、または取得に失敗したときは空を返す。
 */
export async function getPopularPostsFromGa4(env: Ga4Env): Promise<readonly PopularPost[]> {
  try {
    const configuration = getConfiguration(env);
    if (!configuration) return [];

    const accessToken = await getAccessToken(configuration);
    return await runPopularPostsReport(configuration, accessToken);
  } catch (error) {
    console.warn(
      "[analytics] Unable to load popular posts from GA4",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
