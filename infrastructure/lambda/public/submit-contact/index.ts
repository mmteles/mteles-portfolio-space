/**
 * POST /contact
 * Validates input, rate-limits by email, inserts into DB, publishes SNS notification.
 * Runs inside the VPC (private isolated subnet) — no outbound internet needed.
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { query } from "../../shared/db";
import { ok, badRequest, tooManyRequests, serverError } from "../../shared/response";

const sns = new SNSClient({});

function validate(body: Record<string, unknown>): string | null {
  const { name, email, subject, message } = body;
  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100)
    return "name must be 1-100 characters";
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
    return "valid email required (max 255 chars)";
  if (!subject || typeof subject !== "string" || subject.trim().length < 1 || subject.trim().length > 200)
    return "subject must be 1-200 characters";
  if (!message || typeof message !== "string" || message.trim().length < 1 || message.trim().length > 2000)
    return "message must be 1-2000 characters";
  return null;
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return badRequest("Invalid JSON");
    }

    const validationError = validate(body);
    if (validationError) return badRequest(validationError);

    const { name, email, subject, message } = body as Record<string, string>;

    // Atomic rate-limit + insert
    const inserted = await query<{ id: string }>(
      `WITH recent AS (
         SELECT COUNT(*) AS c FROM contact_messages
         WHERE email = $1 AND created_at > NOW() - INTERVAL '60 minutes'
       )
       INSERT INTO contact_messages (name, email, subject, message)
       SELECT $2, $1, $3, $4
       WHERE (SELECT c FROM recent) < 3
       RETURNING id`,
      [email.trim().toLowerCase(), name.trim(), subject.trim(), message.trim()]
    );

    if (!inserted[0]?.id) {
      return tooManyRequests("Too many messages from this email. Try again later.");
    }

    // Publish to SNS for async email delivery (best-effort — don't fail the request if SNS fails)
    const topicArn = process.env.SNS_TOPIC_ARN;
    if (topicArn) {
      try {
        await sns.send(new PublishCommand({
          TopicArn: topicArn,
          Subject: `[Portfolio] ${subject.trim().slice(0, 200)}`,
          Message: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim(),
            messageId: inserted[0].id,
          }),
        }));
      } catch (snsErr) {
        console.warn("SNS publish failed (non-fatal):", snsErr instanceof Error ? snsErr.message : snsErr);
      }
    }

    return ok({ id: inserted[0]?.id, message: "Message sent successfully" });
  } catch (err) {
    return serverError(err);
  }
};
