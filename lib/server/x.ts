import "server-only";

const X_POST_ENDPOINT = "https://api.x.com/2/tweets";

type XPostFailureReason =
  | "not_configured"
  | "billing_required"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "request_failed";

type XPostResult = { ok: true; postId: string } | { ok: false; reason: XPostFailureReason };

function failureReasonForStatus(status: number): XPostFailureReason {
  if (status === 401) return "unauthorized";
  if (status === 402) return "billing_required";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  return "request_failed";
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function base64(bytes: ArrayBuffer) {
  const values = new Uint8Array(bytes);
  let binary = "";
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary);
}

async function createOAuthHeader() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) return null;

  const parameters: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomUUID().replaceAll("-", ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };
  const parameterString = Object.entries(parameters)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signatureBase = `POST&${percentEncode(X_POST_ENDPOINT)}&${percentEncode(parameterString)}`;
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = base64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signatureBase)));
  return `OAuth ${Object.entries({ ...parameters, oauth_signature: signature })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${percentEncode(name)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

function truncate(value: string, limit: number) {
  const characters = Array.from(value.replace(/\s+/g, " ").trim());
  return characters.length <= limit ? characters.join("") : `${characters.slice(0, Math.max(0, limit - 1)).join("")}…`;
}

export function createAnnouncementPost(title: string, body: string, url: string) {
  const titleText = truncate(title, 70);
  const bodyText = truncate(body, 30);
  return `【CosFindからのお知らせ】\n${titleText}${bodyText ? `\n\n${bodyText}` : ""}\n\n${url}\n#CosFind`;
}

export async function postAnnouncementToX(title: string, body: string, url: string): Promise<XPostResult> {
  const authorization = await createOAuthHeader();
  if (!authorization) return { ok: false, reason: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(X_POST_ENDPOINT, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ text: createAnnouncementPost(title, body, url) }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("X announcement post failed", { status: response.status });
      return { ok: false, reason: failureReasonForStatus(response.status) };
    }
    const result = await response.json().catch(() => null) as { data?: { id?: unknown } } | null;
    return typeof result?.data?.id === "string"
      ? { ok: true, postId: result.data.id }
      : { ok: false, reason: "request_failed" };
  } catch (error) {
    console.error("X announcement post failed", { cause: error instanceof Error ? error.name : "unknown" });
    return { ok: false, reason: "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
