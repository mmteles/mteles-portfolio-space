/** HTTP response helpers — keeps Lambda handlers concise. */

type Headers = Record<string, string>;

const BASE_HEADERS: Headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function ok(body: unknown, extra?: Headers) {
  return {
    statusCode: 200,
    headers: { ...BASE_HEADERS, ...extra },
    body: JSON.stringify(body),
  };
}

export function created(body: unknown) {
  return { statusCode: 201, headers: BASE_HEADERS, body: JSON.stringify(body) };
}

const NO_CONTENT_HEADERS: Headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

export function noContent() {
  return { statusCode: 204, headers: NO_CONTENT_HEADERS };
}

export function badRequest(message: string) {
  return { statusCode: 400, headers: BASE_HEADERS, body: JSON.stringify({ error: message }) };
}

export function unauthorized() {
  return { statusCode: 401, headers: BASE_HEADERS, body: JSON.stringify({ error: "Unauthorized" }) };
}

export function forbidden() {
  return { statusCode: 403, headers: BASE_HEADERS, body: JSON.stringify({ error: "Forbidden" }) };
}

export function notFound(resource = "Resource") {
  return { statusCode: 404, headers: BASE_HEADERS, body: JSON.stringify({ error: `${resource} not found` }) };
}

export function tooManyRequests(message = "Too many requests") {
  return { statusCode: 429, headers: BASE_HEADERS, body: JSON.stringify({ error: message }) };
}

export function serverError(err: unknown) {
  // assertAdmin throws a pre-formed HTTP response object — return it directly
  if (typeof err === "object" && err !== null && "statusCode" in err && "body" in err) {
    const res = err as { statusCode: number; body: string };
    return { statusCode: res.statusCode, headers: BASE_HEADERS, body: res.body };
  }
  const hint = err instanceof Error ? err.message : typeof err;
  console.error("Unhandled error:", hint);
  return {
    statusCode: 500,
    headers: BASE_HEADERS,
    body: JSON.stringify({ error: "Internal server error" }),
  };
}
