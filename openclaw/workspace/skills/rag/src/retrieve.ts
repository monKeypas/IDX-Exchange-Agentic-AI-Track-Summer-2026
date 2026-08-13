import { cosineSimilarity } from "../../semantic-search/src/cosine.js";
import { getEmbedding, getEmbeddings } from "../../semantic-search/src/embeddings.js";
import { chunkText } from "./chunk.js";
import {
  emptyRagMeta,
  loadSourceDocuments,
  saveRagIndex,
  type IndexedChunk,
  type RagIndex,
  type SourceDocument,
} from "./ragStore.js";

export interface RetrievedChunk {
  source: string;
  chunk: string;
  score: number;
}

export async function indexDocuments(
  docs: SourceDocument[] = loadSourceDocuments(),
): Promise<RagIndex> {
  const indexed: IndexedChunk[] = [];
  for (const doc of docs) {
    const chunks = chunkText(doc.content);
    if (chunks.length === 0) continue;
    const embeddings = await getEmbeddings(chunks, "RETRIEVAL_DOCUMENT");
    for (let i = 0; i < chunks.length; i++) {
      indexed.push({
        source: doc.title,
        chunk: chunks[i],
        embedding: embeddings[i],
      });
    }
  }
  const index: RagIndex = {
    ...emptyRagMeta(),
    count: indexed.length,
    chunks: indexed,
  };
  saveRagIndex(index);
  return index;
}

export async function retrieve(
  query: string,
  index: RagIndex,
  topK = 4,
): Promise<RetrievedChunk[]> {
  const qEmb = await getEmbedding(query, "RETRIEVAL_QUERY");
  const scored = index.chunks.map((doc) => ({
    source: doc.source,
    chunk: doc.chunk,
    score: cosineSimilarity(qEmb, doc.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, topK));
}
