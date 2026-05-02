/**
 * GET    /admin/timeline            — list all timeline entries
 * POST   /admin/timeline            — create entry
 * PUT    /admin/timeline/{id}       — update entry
 * DELETE /admin/timeline/{id}       — delete entry
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, created, noContent, badRequest, notFound, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;

  try {
    if (method === "GET") {
      const rows = await query(`
        SELECT id, title, organization, start_date, end_date, description, entry_type, sort_order, created_at, updated_at
        FROM timeline_entries
        ORDER BY sort_order ASC, start_date DESC
      `);
      return ok(rows);
    }

    if (method === "POST") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { title, organization, start_date, end_date, description, entry_type, sort_order } = body as Record<string, unknown>;
      if (!title || !organization || !start_date || !entry_type) return badRequest("title, organization, start_date, and entry_type are required");
      if (!["work", "education"].includes(entry_type as string)) return badRequest("entry_type must be 'work' or 'education'");

      const rows = await query(`
        INSERT INTO timeline_entries (title, organization, start_date, end_date, description, entry_type, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [title, organization, start_date, end_date ?? null, description, entry_type, sort_order ?? 0]
      );
      return created(rows[0]);
    }

    if (!id) return badRequest("Missing timeline entry id");

    if (method === "PUT") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { title, organization, start_date, end_date, description, entry_type, sort_order } = body as Record<string, unknown>;
      const rows = await query(`
        UPDATE timeline_entries SET
          title        = COALESCE($2, title),
          organization = COALESCE($3, organization),
          start_date   = COALESCE($4, start_date),
          end_date     = $5,
          description  = COALESCE($6, description),
          entry_type   = COALESCE($7, entry_type),
          sort_order   = COALESCE($8, sort_order),
          updated_at   = now()
        WHERE id = $1
        RETURNING *`,
        [id, title, organization, start_date, end_date ?? null, description, entry_type, sort_order]
      );
      if (rows.length === 0) return notFound("Timeline entry");
      return ok(rows[0]);
    }

    if (method === "DELETE") {
      const rows = await query<{ id: string }>(
        "DELETE FROM timeline_entries WHERE id = $1 RETURNING id",
        [id]
      );
      if (rows.length === 0) return notFound("Timeline entry");
      return noContent();
    }

    return badRequest("Method not allowed");
  } catch (err) {
    return serverError(err);
  }
};
