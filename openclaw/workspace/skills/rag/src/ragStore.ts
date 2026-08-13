import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "../../semantic-search/src/embeddings.js";

export interface SourceDocument {
  title: string;
  path: string;
  content: string;
}

export interface IndexedChunk {
  source: string;
  chunk: string;
  embedding: number[];
}

export interface RagIndex {
  version: 1;
  model: string;
  dimensions: number;
  builtAt: string;
  count: number;
  chunks: IndexedChunk[];
}

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
export const KNOWLEDGE_DIR = join(SKILL_DIR, "knowledge");
const STORE_DIR = join(SKILL_DIR, ".index");
export const DEFAULT_INDEX_PATH = join(STORE_DIR, "chunks.json");

export function getIndexPath(): string {
  return process.env.RAG_INDEX_PATH?.trim() || DEFAULT_INDEX_PATH;
}

export function loadSourceDocuments(dir = KNOWLEDGE_DIR): SourceDocument[] {
  if (!existsSync(dir)) {
    throw new Error(`RAG knowledge folder not found at ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort();
  return files.map((name) => {
    const path = join(dir, name);
    return {
      title: name.replace(/\.md$/i, ""),
      path,
      content: readFileSync(path, "utf8"),
    };
  });
}

export function loadRagIndex(path = getIndexPath()): RagIndex {
  if (!existsSync(path)) {
    throw new Error(`RAG index not found at ${path}. Run: npm run rag:index`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as RagIndex;
  if (!raw?.chunks?.length) {
    throw new Error(`RAG index at ${path} is empty. Run: npm run rag:index`);
  }
  if (raw.model !== EMBEDDING_MODEL || raw.dimensions !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `RAG index model mismatch: index has ${raw.model} (${raw.dimensions}d), ` +
        `current embeddings are ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS}d). Rebuild with npm run rag:index`,
    );
  }
  return raw;
}

export function saveRagIndex(index: RagIndex, path = getIndexPath()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(index));
}

export function emptyRagMeta(): Omit<RagIndex, "chunks" | "count"> {
  return {
    version: 1,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    builtAt: new Date().toISOString(),
  };
}
