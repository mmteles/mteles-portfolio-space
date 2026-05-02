import { APIGatewayProxyResultV2 } from "aws-lambda";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  _event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  // Auth is handled by API Gateway JWT authorizer (Cognito)
  // Admin group is verified via authorizer scopes — no extra DB check needed
  try {
    const rows = await query(`
      SELECT id, name, email, subject, message, is_read, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
