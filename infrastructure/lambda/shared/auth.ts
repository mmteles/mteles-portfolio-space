/**
 * Cognito JWT verification for admin Lambda functions.
 *
 * The HTTP API Gateway JWT authorizer already validates the token signature
 * and expiry before the Lambda is invoked. This module provides:
 *   1. A typed helper to extract claims from the verified token.
 *   2. An admin group check (cognito:groups must contain "admin").
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export interface TokenClaims {
  sub: string;        // Cognito user ID
  email: string;
  groups: string[];   // cognito:groups
}

/**
 * Decode the JWT payload from the Authorization header without re-verifying
 * the signature (API Gateway already verified it). API Gateway HTTP API JWT
 * authorizers do not reliably pass claims whose names contain colons
 * (e.g. "cognito:groups"), so we read directly from the token.
 */
function decodeJwtPayload(event: APIGatewayProxyEventV2WithJWTAuthorizer): Record<string, unknown> | null {
  const authHeader = event.headers?.["authorization"] ?? event.headers?.["Authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  try {
    const base64url = token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw) return [];
  const str = String(raw);
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* fall through */ }
  }
  return str.split(",").map((g) => g.trim()).filter(Boolean);
}

/**
 * Extract and return verified claims from the event.
 * Reads from the decoded JWT payload directly; falls back to API GW claims.
 */
export function getClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): TokenClaims {
  const payload = decodeJwtPayload(event);
  const gwClaims = event.requestContext.authorizer.jwt.claims;

  const sub   = String(payload?.sub   ?? gwClaims.sub   ?? "");
  const email = String(payload?.email ?? gwClaims.email ?? "");
  // "cognito:groups" with a colon is unreliable in API GW claim mapping — read from JWT directly
  const groups = parseGroups(payload?.["cognito:groups"] ?? gwClaims["cognito:groups"]);

  console.log("auth groups:", JSON.stringify(groups));

  return { sub, email, groups };
}

/**
 * Throws a 403 response object if the caller is not in the admin group.
 * Usage: assertAdmin(getClaims(event))
 */
export function assertAdmin(claims: TokenClaims): void {
  if (!claims.groups.includes("admin")) {
    throw { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
  }
}
