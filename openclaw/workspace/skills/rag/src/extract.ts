import { WEEK5_MARKET_SOURCE } from "./marketReport.js";
import type { RetrievedChunk } from "./retrieve.js";

/** Best-effort extractive answer from retrieved chunks (no LLM). */
export function extractiveAnswer(query: string, chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "I do not know from the indexed documents.";

  const live = chunks.find((c) => c.source === WEEK5_MARKET_SOURCE);
  if (live) {
    return live.chunk.trim();
  }

  const q = query.toLowerCase();
  const blob = chunks.map((c) => c.chunk).join("\n\n");

  if (/california_sold/.test(q) && /column/.test(q)) {
    const match = blob.match(/Complete california_sold column list:\s*([^\n]+)/i);
    if (match) {
      return `california_sold columns: ${match[1].replace(/\.\s*$/, "")}.`;
    }
  }

  if (/\bdom\b|days on market/.test(q)) {
    const sent = firstSentence(blob, /DOM means Days on Market[^.]*\./i);
    if (sent) return sent;
  }

  if (/list-to-close|list to close|sale-to-list|sale to list/.test(q)) {
    const sent = firstSentence(
      blob,
      /List-to-close ratio[^.]*percent\./i,
    );
    if (sent) return sent;
  }

  // Fallback: return the top chunk as a readable paragraph.
  return chunks[0].chunk.replace(/\s+/g, " ").trim();
}

function firstSentence(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[0]?.trim() ?? null;
}
