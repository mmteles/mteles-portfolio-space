import { APIGatewayProxyResultV2 } from "aws-lambda";
import { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { getClaims, assertAdmin } from "../../shared/auth";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    assertAdmin(getClaims(event));
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
