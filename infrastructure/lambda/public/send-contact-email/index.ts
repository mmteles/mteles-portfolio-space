/**
 * SNS-triggered Lambda — runs OUTSIDE the VPC so it can call SES directly.
 * Receives contact form submissions from SNS, sends email via Amazon SES.
 */
import { SNSEvent } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-west-2" });

function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const handler = async (event: SNSEvent): Promise<void> => {
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!toEmail || !fromEmail) {
    console.error("CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL not set");
    return;
  }

  for (const record of event.Records) {
    try {
      const payload = JSON.parse(record.Sns.Message) as {
        name: string;
        email: string;
        subject: string;
        message: string;
        messageId: string;
      };

      const { name, email, subject, message } = payload;

      await ses.send(new SendEmailCommand({
        Source: `"Portfolio Contact" <${fromEmail}>`,
        Destination: { ToAddresses: [toEmail] },
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Data: `[Portfolio] ${subject.slice(0, 200)}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: `
                <h2>New contact message</h2>
                <p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;</p>
                <p><strong>Subject:</strong> ${escape(subject)}</p>
                <hr />
                <p>${escape(message).replace(/\n/g, "<br>")}</p>
              `,
              Charset: "UTF-8",
            },
          },
        },
      }));

      console.log(`Email sent for contact message ${payload.messageId}`);
    } catch (err) {
      console.error("Failed to send email for SNS record:", err);
    }
  }
};
