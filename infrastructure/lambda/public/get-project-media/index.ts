import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, badRequest, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const projectId = event.pathParameters?.id;
    if (!projectId) return badRequest("Missing project id");

    const rows = await query(
      `SELECT id, project_id, url, alt, sort_order, created_at
       FROM project_media
       WHERE project_id = $1
       ORDER BY sort_order ASC`,
      [projectId]
    );

    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
};
