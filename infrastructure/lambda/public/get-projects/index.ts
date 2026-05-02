import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, serverError } from "../../shared/response";

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const rows = await query(`
      SELECT id, title, short_description, description, features, tags,
             demo_url, github_url, thumbnail_url, sort_order, created_at, updated_at
      FROM projects
      WHERE published = true
      ORDER BY sort_order ASC, created_at DESC
    `);
    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
