import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { query } from "../../shared/db";
import { ok, notFound, serverError } from "../../shared/response";

export const handler = async (
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Intentionally excludes `email` column (public-safe equivalent of profiles_public view)
    const rows = await query(`
      SELECT id, full_name, title, tagline, bio, photo_url,
             linkedin_url, github_url, hero_stats, created_at, updated_at
      FROM profiles
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (rows.length === 0) return notFound("Profile");
    return ok(rows[0]);
  } catch (err) {
    return serverError(err);
  }
};
