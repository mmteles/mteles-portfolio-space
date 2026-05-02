/**
 * GET    /admin/projects            — list all projects (including unpublished)
 * POST   /admin/projects            — create project
 * PUT    /admin/projects/{id}       — update project
 * DELETE /admin/projects/{id}       — delete project + its media records
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { assertAdmin, getClaims } from "../../shared/auth";
import { query, withTransaction } from "../../shared/db";
import { ok, created, noContent, badRequest, notFound, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const id = event.pathParameters?.id;

  try {
    assertAdmin(getClaims(event));
    // GET /admin/projects
    if (method === "GET" && !id) {
      const rows = await query(`
        SELECT p.*, COALESCE(
          json_agg(pm ORDER BY pm.sort_order) FILTER (WHERE pm.id IS NOT NULL), '[]'
        ) AS media
        FROM projects p
        LEFT JOIN project_media pm ON pm.project_id = p.id
        GROUP BY p.id
        ORDER BY p.sort_order ASC, p.created_at DESC
      `);
      return ok(rows);
    }

    // POST /admin/projects
    if (method === "POST") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { title, short_description, description, features, tags, demo_url, github_url, thumbnail_url, sort_order, published } = body as Record<string, unknown>;
      if (!title) return badRequest("title is required");

      const rows = await query(`
        INSERT INTO projects (title, short_description, description, features, tags, demo_url, github_url, thumbnail_url, sort_order, published)
        VALUES ($1, $2, $3, $4::jsonb, $5::text[], $6, $7, $8, $9, $10)
        RETURNING *`,
        [title, short_description, description,
          JSON.stringify(features ?? []),
          Array.isArray(tags) ? tags : [],
          demo_url, github_url, thumbnail_url,
          sort_order ?? 0, published ?? false]
      );
      return created(rows[0]);
    }

    if (!id) return badRequest("Missing project id");

    // PUT /admin/projects/{id}
    if (method === "PUT") {
      let body: Record<string, unknown>;
      try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

      const { title, short_description, description, features, tags, demo_url, github_url, thumbnail_url, sort_order, published } = body as Record<string, unknown>;

      const rows = await query(`
        UPDATE projects SET
          title             = COALESCE($2, title),
          short_description = COALESCE($3, short_description),
          description       = COALESCE($4, description),
          features          = COALESCE($5::jsonb, features),
          tags              = COALESCE($6::text[], tags),
          demo_url          = COALESCE($7, demo_url),
          github_url        = COALESCE($8, github_url),
          thumbnail_url     = COALESCE($9, thumbnail_url),
          sort_order        = COALESCE($10, sort_order),
          published         = COALESCE($11, published),
          updated_at        = now()
        WHERE id = $1
        RETURNING *`,
        [id, title, short_description, description,
          features !== undefined ? JSON.stringify(features) : null,
          Array.isArray(tags) ? tags : null,
          demo_url, github_url, thumbnail_url, sort_order, published]
      );
      if (rows.length === 0) return notFound("Project");
      return ok(rows[0]);
    }

    // DELETE /admin/projects/{id}
    if (method === "DELETE") {
      let deleted = false;
      await withTransaction(async (client) => {
        await client.query("DELETE FROM project_media WHERE project_id = $1", [id]);
        const res = await client.query<{ id: string }>(
          "DELETE FROM projects WHERE id = $1 RETURNING id", [id]
        );
        deleted = res.rowCount !== null && res.rowCount > 0;
      });
      if (!deleted) return notFound("Project");
      return noContent();
    }

    return badRequest("Method not allowed");
  } catch (err) {
    return serverError(err);
  }
};
