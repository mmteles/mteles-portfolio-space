import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const rows = await query(`
      SELECT id, name, sort_order, tags
      FROM tag_groups
      ORDER BY sort_order ASC, name ASC
    `);
    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
