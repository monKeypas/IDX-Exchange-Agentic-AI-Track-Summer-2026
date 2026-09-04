export type EmailStatus = "pending_approval" | "approved" | "sent" | "rejected";

export type EmailUseCase =
  | "listing_alert"
  | "market_report"
  | "property_summary"
  | "recommendation_digest";

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  useCase: EmailUseCase;
  status: EmailStatus;
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
  meta?: Record<string, unknown>;
}

export interface DraftResult {
  draft: EmailDraft;
  status: "pending_approval";
  preview: string;
}
