/**
 * POST /contact
 * Validates input, rate-limits by email, inserts into DB, sends email via Resend.
 * Consolidates the two separate Supabase calls from the current Contact.tsx.
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { query } from "../../shared/db";
import { ok, badRequest, tooManyRequests, serverError } from "../../shared/response";

const smClient = new SecretsManagerClient({});
let resendApiKey: string | null = null;

async function getResendKey(): Promise<string> {
  if (resendApiKey) return resendApiKey;
  const res = await smClient.send(
    new GetSecretValueCommand({ SecretId: process.env.RESEND_SECRET_ARN! })
  );
  resendApiKey = res.SecretString!;
  return resendApiKey;
}

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

    // Server-side rate limit: max 3 messages per email per 60 minutes
    const rateLimitRows = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM contact_messages
       WHERE email = $1 AND created_at > NOW() - INTERVAL '60 minutes'`,
      [email.toLowerCase()]
    );
    if (parseInt(rateLimitRows[0]?.count ?? "0", 10) >= 3) {
      return tooManyRequests("Too many messages from this email. Try again later.");
    }

    // Insert into DB
    const inserted = await query<{ id: string }>(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    // Send email notification (best-effort — don't fail the request if email fails)
    try {
      const apiKey = await getResendKey();
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Portfolio Contact <onboarding@resend.dev>",
          to: ["mauricio.mteles@gmail.com"],
          reply_to: email,
          subject: `[Portfolio] ${escape(subject)}`,
          html: `
            <h2>New contact message</h2>
            <p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;</p>
            <p><strong>Subject:</strong> ${escape(subject)}</p>
            <hr />
            <p>${escape(message).replace(/\n/g, "<br>")}</p>
          `,
        }),
      });
    } catch (emailErr) {
      console.warn("Email send failed (non-fatal):", emailErr);
    }

    return ok({ id: inserted[0]?.id, message: "Message sent successfully" });
  } catch (err) {
    return serverError(err);
  }
};
