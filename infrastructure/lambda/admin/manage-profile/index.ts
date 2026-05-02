/**
 * GET  /admin/profile  — return the single profile row (with email)
 * PUT  /admin/profile  — upsert the profile record
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "crypto";
import { assertAdmin, getClaims } from "../../shared/auth";
import { query } from "../../shared/db";
import { ok, notFound, badRequest, serverError } from "../../shared/response";

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    assertAdmin(getClaims(event));

    if (event.requestContext.http.method === "GET") {
      const rows = await query(
        `SELECT id, full_name, title, tagline, bio, photo_url,
                linkedin_url, github_url, email, hero_stats, created_at, updated_at
         FROM profiles LIMIT 1`
      );
      if (rows.length === 0) return notFound("Profile");
      return ok(rows[0]);
    }

    // PUT — upsert
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("Invalid JSON");
    }

    const {
      full_name, title, tagline, bio, photo_url,
      linkedin_url, github_url, email, hero_stats,
    } = body as Record<string, unknown>;

    // Fetch existing profile id to ensure ON CONFLICT (id) fires correctly.
    // If no profile exists yet, generate a stable UUID for the first insert.
    const existing = await query<{ id: string }>(
      `SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1`
    );
    const profileId = existing[0]?.id ?? randomUUID();

    const rows = await query(`
      INSERT INTO profiles (id, full_name, title, tagline, bio, photo_url, linkedin_url, github_url, email, hero_stats)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        full_name    = EXCLUDED.full_name,
        title        = EXCLUDED.title,
        tagline      = EXCLUDED.tagline,
        bio          = EXCLUDED.bio,
        photo_url    = EXCLUDED.photo_url,
        linkedin_url = EXCLUDED.linkedin_url,
        github_url   = EXCLUDED.github_url,
        email        = EXCLUDED.email,
        hero_stats   = EXCLUDED.hero_stats,
        updated_at   = now()
      RETURNING *`,
      [profileId, full_name, title, tagline, bio, photo_url, linkedin_url, github_url, email, JSON.stringify(hero_stats ?? [])]
    );

    return ok(rows[0]);
  } catch (err) {
    return serverError(err);
  }
};
