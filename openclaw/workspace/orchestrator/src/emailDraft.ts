/** Format property or market content as a ready-to-send email draft. */
export function formatEmailDraft(options: {
  subject: string;
  body: string;
  recipientHint?: string;
}): string {
  const lines = [
    `Subject: ${options.subject}`,
    options.recipientHint ? `To: ${options.recipientHint}` : null,
    "",
    options.body.trim(),
    "",
    "---",
    "Draft only — not sent.",
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
