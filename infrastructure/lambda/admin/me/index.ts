/**
 * GET /admin/me
 * Returns whether the authenticated Cognito user is in the "admin" Cognito group.
 * API Gateway has already verified the JWT before this Lambda is invoked.
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { getClaims } from "../../shared/auth";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const claims = getClaims(event);
    const isAdmin = claims.groups.includes("admin");
    return ok({ isAdmin });
  } catch (err) {
    return serverError(err);
  }
};
