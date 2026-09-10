/** Format property or market content as a ready-to-send email draft. */
export function formatEmailDraft(options: {
  subject: string;
  body: string;
  recipientHint?: string;
  draftId?: string;
}): string {
  const lines = [
    options.draftId ? `Draft ${options.draftId}` : null,
    `Subject: ${options.subject}`,
    options.recipientHint ? `To: ${options.recipientHint}` : null,
    "",
    options.body.trim(),
    "",
    "---",
    "Draft only — not sent.",
    // The approval step is the Week 11 guardrail: a human must say so explicitly.
    options.draftId ? 'Reply "approve" to send it, or ignore to discard.' : null,
  ].filter((line) => line != null);

  return lines.join("\n");
}

export function inferEmailSubject(query: string, fallback: string): string {
  const match = query.match(/\b(?:about|for|on|regarding)\s+(.+?)(?:\?|$)/i);
  if (match?.[1]) {
    const topic = match[1].trim().replace(/\.$/, "");
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }
  return fallback;
}

/** Pull an explicit recipient out of the message, else fall back to the configured sender. */
export function resolveRecipient(query: string): string | null {
  const match = query.match(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/);
  if (match) return match[0];
  return process.env.EMAIL_USER?.trim() || null;
}
