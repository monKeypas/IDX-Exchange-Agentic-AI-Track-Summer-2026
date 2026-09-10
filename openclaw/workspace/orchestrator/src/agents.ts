import { answerMarketQuestion } from "../../skills/market-stats/src/marketStats.js";
import { parsePropertyQuery } from "../../skills/property-search/src/parsePropertyQuery.js";
import { searchActiveListings } from "../../skills/property-search/src/mlsSearch.js";
import {
  formatListingResults,
  getSession,
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
  const filters = await parsePropertyQuery(query);
  const { rows } = await searchActiveListings(filters, 1, 5);
  updateSession(userId, { lastResults: rows, conversationStep: getSession(userId).conversationStep + 1 });
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

export async function recommendationAgent(
  query: string,
  userId: string,
): Promise<AgentResult> {
  let text = query.trim();
  const session = getSession(userId);
  const liked = session.lastResults?.[0];
  if (liked && !/\b(like|similar|recommend)\b/i.test(text)) {
    const address = [liked.L_Address, liked.L_City].filter(Boolean).join(", ");
    text = `I like ${address}, find similar homes`;
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

  let body = "";
  if (wantsListings || !wantsMarket) {
    const listings = await propertySearchAgent(query, userId);
    body = listings.reply;
  }
  if (wantsMarket) {
    const stats = await marketStatsAgent(query);
    body = body ? `${body}\n\n${stats.reply}` : stats.reply;
  }
  if (!body) {
    const listings = await propertySearchAgent(query, userId);
    body = listings.reply;
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
