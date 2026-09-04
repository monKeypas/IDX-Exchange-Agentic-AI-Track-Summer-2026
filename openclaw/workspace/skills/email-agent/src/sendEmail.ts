import nodemailer from "nodemailer";
import { assertSendAllowed, redactSecrets, safeLog } from "./guardrails.js";
import type { EmailDraft } from "./types.js";

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASSWORD must be set in .env before sending.",
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/**
 * STEP 2: Send only after explicit human confirmation (--approve).
 * Never call this from autonomous / heartbeat paths.
 */
export async function sendApprovedEmail(
  draft: EmailDraft,
  options: { explicitApprove: boolean } = { explicitApprove: false },
): Promise<EmailDraft> {
  assertSendAllowed({
    status: draft.status,
    explicitApprove: options.explicitApprove,
  });

  const transporter = createTransporter();
  const from = process.env.EMAIL_USER!;

  // Log metadata only — never credentials or full password-bearing config
  safeLog(`Sending approved email draft=${draft.id} to=${draft.to} subject=${draft.subject}`);

  await transporter.sendMail({
    from,
    to: draft.to,
    subject: draft.subject,
    html: draft.body,
    text: redactSecrets(draft.body.replace(/<[^>]+>/g, " ")),
  });

  return {
    ...draft,
    status: "sent",
    sentAt: new Date().toISOString(),
    approvedAt: draft.approvedAt ?? new Date().toISOString(),
  };
}
