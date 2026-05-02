import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, notFound, badRequest, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing project id");

    const rows = await query(
      `SELECT id, title, short_description, description, features, tags,
              demo_url, github_url, thumbnail_url, sort_order, created_at, updated_at
       FROM projects
       WHERE id = $1 AND published = true`,
      [id]
    );

    if (rows.length === 0) return notFound("Project");
    return ok(rows[0]);
  } catch (err) {
    return serverError(err);
  }
};
