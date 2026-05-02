import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const rows = await query(`
      SELECT id, title, organization, start_date, end_date,
             description, entry_type, sort_order, created_at, updated_at
      FROM timeline_entries
      ORDER BY sort_order ASC, start_date DESC
    `);
    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
