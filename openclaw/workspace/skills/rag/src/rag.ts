import { extractiveAnswer } from "./extract.js";
import { generateGroundedAnswer } from "./generate.js";
import { fetchWeek5MarketChunk } from "./marketReport.js";
import { loadRagIndex } from "./ragStore.js";
import { retrieve, type RetrievedChunk } from "./retrieve.js";

export interface RagResult {
  query: string;
  chunks: RetrievedChunk[];
  answer: string;
  reply: string;
}

export function formatRagReply(answer: string, chunks: RetrievedChunk[]): string {
  const sources = [...new Set(chunks.map((c) => c.source))];
  return [
    answer.trim(),
    "",
    `Sources: ${sources.join(", ")}`,
  ].join("\n");
}

/** Retrieve top chunks and generate a grounded answer. */
export async function ragAnswer(
  queryText: string,
  options: { topK?: number } = {},
): Promise<RagResult> {
  const query = queryText.trim();
  if (!query) {
    return {
      query: queryText,
      chunks: [],
      answer: "",
      reply: 'Usage: npm run rag -- "What does DOM mean?"',
    };
  }

  const index = loadRagIndex();
  const [docChunks, liveReport] = await Promise.all([
    retrieve(query, index, options.topK ?? 4),
    fetchWeek5MarketChunk(query),
  ]);
  const chunks = liveReport ? [liveReport, ...docChunks] : docChunks;
  let answer: string;
  try {
    answer = await generateGroundedAnswer(query, chunks);
  } catch {
    // Retrieval still succeeded; quote the indexed docs if chat quota is exhausted.
    answer = extractiveAnswer(query, chunks);
  }
  return {
    query,
    chunks,
    answer,
    reply: formatRagReply(answer, chunks),
  };
}
