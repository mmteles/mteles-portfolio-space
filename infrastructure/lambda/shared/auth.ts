/**
 * Cognito JWT verification for admin Lambda functions.
 *
 * The HTTP API Gateway JWT authorizer already validates the token signature
 * and expiry before the Lambda is invoked. This module provides:
 *   1. A typed helper to extract claims from the verified token.
 *   2. An admin group check (cognito:groups must contain "admin").
 *
 * If you need to call admin Lambdas directly (e.g. via SAM local), you can
 * set SKIP_AUTH=true in the environment for local development only.
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export interface TokenClaims {
  sub: string;        // Cognito user ID
  email: string;
  groups: string[];   // cognito:groups
}

/**
 * Extract and return verified claims from the event.
 * API Gateway already verified the JWT before this Lambda is invoked.
 */
export function getClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): TokenClaims {
  const claims = event.requestContext.authorizer.jwt.claims;

  const rawGroups = claims["cognito:groups"] ?? "";
  const groups = Array.isArray(rawGroups)
    ? rawGroups
    : String(rawGroups).split(",").map((g) => g.trim()).filter(Boolean);

  return {
    sub: String(claims.sub ?? ""),
    email: String(claims.email ?? ""),
    groups,
  };
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
