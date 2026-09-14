import { answerMarketQuestion } from "../../skills/market-stats/src/marketStats.js";
import { searchActiveListings } from "../../skills/property-search/src/mlsSearch.js";
import {
  formatListingResults,
  getSession,
  parseConversationalUpdate,
  sessionToFilters,
  updateSession,
} from "../../skills/property-search/src/session.js";
import { recommendSimilarListings } from "../../skills/recommendations/src/recommend.js";
import { ragAnswer } from "../../skills/rag/src/rag.js";
import { searchSemanticListings } from "../../skills/semantic-search/src/semanticSearch.js";
import { draftEmail, markApproved } from "../../skills/email-agent/src/draftEmail.js";
import { getDraft, listDrafts, saveDraft, updateDraft } from "../../skills/email-agent/src/draftStore.js";
import { sendApprovedEmail } from "../../skills/email-agent/src/sendEmail.js";
import type { EmailUseCase } from "../../skills/email-agent/src/types.js";
import { extractDraftId } from "./classifyIntent.js";
import { formatEmailDraft, inferEmailSubject, resolveRecipient } from "./emailDraft.js";

export interface AgentResult {
  agent: string;
  reply: string;
}

export async function propertySearchAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  // Parse this message alone, then merge it onto what earlier turns established,
  // so "Under $1.2M" keeps the city from two messages ago.
  const updates = await parseConversationalUpdate(query);
  const current = getSession(userId);
  updateSession(userId, { ...updates, conversationStep: current.conversationStep + 1 });

  const session = getSession(userId);
  const { rows } = await searchActiveListings(sessionToFilters(session), 1, 5);
  updateSession(userId, { lastResults: rows });

  return {
    agent: "propertySearchAgent",
    reply: formatListingResults(rows),
  };
}

export async function marketStatsAgent(query: string): Promise<AgentResult> {
  const report = await answerMarketQuestion(query);
  return {
    agent: "marketStatsAgent",
    reply: report.reply,
  };
}

const ORDINAL_POSITIONS: Record<string, number> = {
  first: 0, "1st": 0, one: 0,
  second: 1, "2nd": 1, two: 1,
  third: 2, "3rd": 2, three: 2,
  fourth: 3, "4th": 3, four: 3,
  fifth: 4, "5th": 4, five: 4,
};

/**
 * "the first one", "#2", "that one" — which of the listings we just showed?
 * Returns a zero-based index, or null when the message names no position.
 */
export function referencedResultIndex(text: string): number | null {
  const ordinal = text.match(
    /\b(?:the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\b/i,
  );
  if (ordinal) return ORDINAL_POSITIONS[ordinal[1].toLowerCase()] ?? null;

  const numbered = text.match(/(?:#|number\s*|option\s*)(\d)\b/i);
  if (numbered) return Math.max(0, Number(numbered[1]) - 1);

  if (/\b(that one|this one|the one|that place)\b/i.test(text)) return 0;
  return null;
}

export async function recommendationAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  let text = query.trim();
  const session = getSession(userId);
  const results = session.lastResults ?? [];

  // A reference like "the first one" means nothing to the matcher on its own —
  // swap in the actual address of the listing the user is pointing at.
  const index = referencedResultIndex(text);
  const referenced =
    index != null ? results[index] : /\b(like|similar|recommend)\b/i.test(text) ? null : results[0];

  if (referenced) {
    const address = [referenced.L_Address, referenced.L_City].filter(Boolean).join(", ");
    if (address) text = `I like ${address}, find similar homes`;
  }

  const result = await recommendSimilarListings(text, { topK: 5 });
  return {
    agent: "recommendationAgent",
    reply: result.reply,
  };
}

/** Free-text description → L_Remarks embedding search (Week 6). */
export async function semanticSearchAgent(query: string): Promise<AgentResult> {
  const result = await searchSemanticListings(query, { topK: 5 });
  return {
    agent: "semanticSearchAgent",
    reply: result.reply,
  };
}

export async function ragAgent(query: string): Promise<AgentResult> {
  const result = await ragAnswer(query, { topK: 4 });
  return {
    agent: "ragAgent",
    reply: result.reply,
  };
}

export async function emailDraftAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  const lower = query.toLowerCase();
  const wantsMarket = /\b(market|stats|trend|dom|prices?)\b/i.test(lower);
  const wantsListings = /\b(home|listing|property|condo|house)\b/i.test(lower);

  // Search with the filters already established — asking for an email is not
  // itself a search refinement, and must not overwrite what the user set up.
  const listingsFromSession = async () => {
    const { rows } = await searchActiveListings(sessionToFilters(getSession(userId)), 1, 5);
    return formatListingResults(rows);
  };

  let body = "";
  if (wantsListings || !wantsMarket) {
    body = await listingsFromSession();
  }
  if (wantsMarket) {
    const stats = await marketStatsAgent(query);
    body = body ? `${body}\n\n${stats.reply}` : stats.reply;
  }
  if (!body) {
    body = await listingsFromSession();
  }

  const subject = inferEmailSubject(
    query,
    wantsMarket ? "Market update" : "Property listings summary",
  );
  const useCase: EmailUseCase = wantsMarket ? "market_report" : "listing_alert";
  const to = resolveRecipient(query);

  // No recipient configured — still show the draft, but make the gap explicit.
  if (!to) {
    return {
      agent: "emailDraftAgent",
      reply: [
        formatEmailDraft({ subject, body }),
        "",
        "No recipient found. Include an address (e.g. \"email this to me@example.com\")",
        "or set EMAIL_USER in .env, then ask again.",
      ].join("\n"),
    };
  }

  // Persist so a later "approve" has something concrete to act on.
  const { draft } = await draftEmail(to, subject, body, useCase, { userId, query });
  saveDraft(draft);

  return {
    agent: "emailDraftAgent",
    reply: formatEmailDraft({
      subject,
      body,
      recipientHint: to,
      draftId: draft.id,
    }),
  };
}

/**
 * Week 11 guardrail, WhatsApp side: sends ONLY the draft a human just approved.
 * Reached exclusively from the "email_approve" intent — never from a draft turn,
 * a heartbeat, or any autonomous path.
 */
export async function emailApprovalAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  const explicitId = extractDraftId(query);
  const draft = explicitId
    ? getDraft(explicitId)
    : listDrafts().find(
        (d) => d.status === "pending_approval" && d.meta?.userId === userId,
      ) ?? null;

  if (!draft) {
    return {
      agent: "emailApprovalAgent",
      reply: explicitId
        ? `No draft found with id ${explicitId}.`
        : "No draft is waiting for approval. Ask me to draft an email first.",
    };
  }

  if (draft.status === "sent") {
    return {
      agent: "emailApprovalAgent",
      reply: `Draft ${draft.id} was already sent to ${draft.to}.`,
    };
  }

  const approved = updateDraft(markApproved(draft));

  try {
    const sent = await sendApprovedEmail(approved, { explicitApprove: true });
    updateDraft(sent);
    return {
      agent: "emailApprovalAgent",
      reply: `Sent "${sent.subject}" to ${sent.to}.`,
    };
  } catch (err) {
    // Leave the draft approved-but-unsent so it can be retried once configured.
    const reason = err instanceof Error ? err.message : String(err);
    return {
      agent: "emailApprovalAgent",
      reply: `Approved draft ${approved.id}, but sending failed: ${reason}`,
    };
  }
}
