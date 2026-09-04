import { randomUUID } from "node:crypto";
import type { DraftResult, EmailDraft, EmailUseCase } from "./types.js";

/**
 * STEP 1: Draft only — never sends.
 * Returns pending_approval so a human must confirm before sendApprovedEmail.
 */
export async function draftEmail(
  to: string,
  subject: string,
  body: string,
  useCase: EmailUseCase = "property_summary",
  meta?: Record<string, unknown>,
): Promise<DraftResult> {
  const draft: EmailDraft = {
    id: randomUUID(),
    to: to.trim(),
    subject: subject.trim(),
    body,
    useCase,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    meta,
  };

  return {
    draft,
    status: "pending_approval",
    preview: formatDraftPreview(draft),
  };
}

export function formatDraftPreview(draft: EmailDraft): string {
  return [
    `DRAFT ${draft.id}`,
    `Status: ${draft.status}`,
    `Use case: ${draft.useCase}`,
    `To: ${draft.to}`,
    `Subject: ${draft.subject}`,
    "",
    draft.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800),
    "",
    "---",
    "Draft only — not sent. Review, then: npm run email:send -- --id <id> --approve",
  ].join("\n");
}

export function markApproved(draft: EmailDraft): EmailDraft {
  return {
    ...draft,
    status: "approved",
    approvedAt: new Date().toISOString(),
  };
}
