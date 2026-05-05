/**
 * GET /admin/me
 * Returns whether the authenticated Cognito user is in the "admin" Cognito group.
 * API Gateway has already verified the JWT before this Lambda is invoked.
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { getClaims } from "../../shared/auth";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract the user's Cognito subject (sub) from verified JWT claims.
    // Use the DB (user_roles table) as the authoritative source of roles.
    const { sub } = getClaims(event);

    // Query the authoritative user_roles table for this user.
    const rows = await query<{ role: string }>(
      `SELECT role FROM user_roles WHERE cognito_sub = $1`,
      [sub]
    );

    const isAdmin = rows.some((r) => r.role === "admin");
    return ok({ isAdmin });
  } catch (err) {
    return serverError(err);
  }
};
