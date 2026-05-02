/**
 * POST /admin/upload-url
 * Returns a presigned S3 PUT URL for direct browser-to-S3 upload.
 * Replaces the supabase.storage.from().upload() pattern.
 *
 * Body: { bucket: "project-media" | "resume", filename: string, contentType: string }
 * Response: { uploadUrl: string, publicUrl: string }
 */
import { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ok, badRequest, serverError } from "../../shared/response";
import { randomUUID } from "crypto";

const s3 = new S3Client({});
const CDN_URL = (process.env.CDN_URL ?? "").replace(/\/$/, "");

const ALLOWED_BUCKETS: Record<string, string> = {
  "project-media": process.env.MEDIA_BUCKET!,
  resume: process.env.RESUME_BUCKET!,
};

const ALLOWED_TYPES: Record<string, string[]> = {
  "project-media": ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"],
  resume: ["application/pdf"],
};

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  try {
    let body: { bucket?: string; filename?: string; contentType?: string };
    try { body = JSON.parse(event.body ?? "{}"); } catch { return badRequest("Invalid JSON"); }

    const { bucket, filename, contentType } = body;

    if (!bucket || !ALLOWED_BUCKETS[bucket]) return badRequest("bucket must be 'project-media' or 'resume'");
    if (!filename || typeof filename !== "string") return badRequest("filename is required");
    if (!contentType || !ALLOWED_TYPES[bucket].includes(contentType)) {
      return badRequest(`contentType not allowed for ${bucket}`);
    }

    const bucketName = ALLOWED_BUCKETS[bucket]!;
    const ext = filename.split(".").pop() ?? "";
    const key = bucket === "resume"
      ? `resume-${Date.now()}.${ext}`
      : `${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    const prefix = bucket === "resume" ? "/resume/" : "/";
    const publicUrl = `${CDN_URL}${prefix}${key}`.replace(/([^:])\/+/g, "$1/");

    return ok({ uploadUrl, publicUrl, key });
  } catch (err) {
    return serverError(err);
  }
};
