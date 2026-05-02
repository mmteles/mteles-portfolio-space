/**
 * GET /admin/me
 * Returns whether the authenticated Cognito user has the "admin" role
 * in the user_roles table (the authoritative DB-level role store).
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { getClaims } from "../../shared/auth";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const { sub } = getClaims(event);
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
