import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, badRequest, notFound, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing message id");

    const rows = await query<{ id: string }>(
      `UPDATE contact_messages SET is_read = true WHERE id = $1 RETURNING id`,
      [id]
    );

    if (rows.length === 0) return notFound("Message");
    return ok({ id: rows[0].id });
  } catch (err) {
    return serverError(err);
  }
};
