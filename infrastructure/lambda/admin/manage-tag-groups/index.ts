/**
 * GET    /admin/tag-groups         — list all groups
 * POST   /admin/tag-groups         — create group
 * PUT    /admin/tag-groups/{id}    — update group (name, sort_order, tags)
 * DELETE /admin/tag-groups/{id}    — delete group
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { assertAdmin, getClaims } from "../../shared/auth";
import { query } from "../../shared/db";
import { ok, created, noContent, badRequest, notFound, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;

  try {
    assertAdmin(getClaims(event));

    // GET /admin/tag-groups
    if (method === "GET") {
      const rows = await query(`
        SELECT id, name, sort_order, tags, created_at, updated_at
        FROM tag_groups
        ORDER BY sort_order ASC, name ASC
      `);
      return ok(rows);
    }

    // POST /admin/tag-groups
    if (method === "POST") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { name, sort_order, tags } = body as Record<string, unknown>;
      if (!name || typeof name !== "string" || !name.trim()) return badRequest("name is required");

      const rows = await query(`
        INSERT INTO tag_groups (name, sort_order, tags)
        VALUES ($1, $2, $3::text[])
        RETURNING *`,
        [name.trim(), sort_order ?? 0, Array.isArray(tags) ? tags : []]
      );
      return created(rows[0]);
    }

    if (!id) return badRequest("Missing tag group id");

    // PUT /admin/tag-groups/{id}
    if (method === "PUT") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { name, sort_order, tags } = body as Record<string, unknown>;

      const rows = await query(`
        UPDATE tag_groups SET
          name       = COALESCE($2, name),
          sort_order = COALESCE($3, sort_order),
          tags       = COALESCE($4::text[], tags),
          updated_at = now()
        WHERE id = $1
        RETURNING *`,
        [
          id,
          name !== undefined ? String(name).trim() : null,
          sort_order !== undefined ? sort_order : null,
          Array.isArray(tags) ? tags : null,
        ]
      );
      if (rows.length === 0) return notFound("Tag group");
      return ok(rows[0]);
    }

    // DELETE /admin/tag-groups/{id}
    if (method === "DELETE") {
      const rows = await query<{ id: string }>(
        "DELETE FROM tag_groups WHERE id = $1 RETURNING id",
        [id]
      );
      if (rows.length === 0) return notFound("Tag group");
      return noContent();
    }

    return badRequest("Method not allowed");
  } catch (err) {
    return serverError(err);
  }
};
