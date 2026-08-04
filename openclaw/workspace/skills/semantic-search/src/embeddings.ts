import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export type EmbeddingProvider = "local" | "gemini";
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

const LOCAL_MODEL = "Xenova/all-MiniLM-L6-v2";
const LOCAL_DIMENSIONS = 384;
const GEMINI_MODEL = "gemini-embedding-001";
const GEMINI_DIMENSIONS = 768;

/** Active provider: local (default) or gemini via EMBEDDING_PROVIDER. */
export function getEmbeddingProvider(): EmbeddingProvider {
  const raw = (process.env.EMBEDDING_PROVIDER ?? "local").trim().toLowerCase();
  if (raw === "gemini") return "gemini";
  if (raw === "local" || raw === "") return "local";
  throw new Error(`Invalid EMBEDDING_PROVIDER="${raw}". Use "local" or "gemini".`);
}

export const EMBEDDING_MODEL =
  getEmbeddingProvider() === "gemini" ? GEMINI_MODEL : LOCAL_MODEL;
export const EMBEDDING_DIMENSIONS =
  getEmbeddingProvider() === "gemini" ? GEMINI_DIMENSIONS : LOCAL_DIMENSIONS;

/** Resolve Gemini/Google API key from env or OpenClaw config (no secrets logged). */
export function resolveGeminiApiKey(): string {
  const fromEnv =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (fromEnv?.trim()) return fromEnv.trim();

  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  if (!existsSync(configPath)) {
    throw new Error(
      "No Gemini API key found. Set GEMINI_API_KEY in .env or configure Google in ~/.openclaw/openclaw.json",
    );
  }

  const cfg = JSON.parse(readFileSync(configPath, "utf8")) as {
    plugins?: { entries?: { google?: { config?: { webSearch?: { apiKey?: string } } } } };
  };
  const fromOpenClaw = cfg.plugins?.entries?.google?.config?.webSearch?.apiKey?.trim();
  if (fromOpenClaw) return fromOpenClaw;

  throw new Error(
    "No Gemini API key found. Set GEMINI_API_KEY in .env or plugins.entries.google.config.webSearch.apiKey in OpenClaw config.",
  );
}

function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: resolveGeminiApiKey() });
}

function normalizeText(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
}

let localExtractor: FeatureExtractionPipeline | null = null;

async function getLocalExtractor(): Promise<FeatureExtractionPipeline> {
  if (!localExtractor) {
    localExtractor = await pipeline("feature-extraction", LOCAL_MODEL);
  }
  return localExtractor;
}

async function getLocalEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getLocalExtractor();
  const cleaned = texts.map(normalizeText);
  const output = await extractor(cleaned, { pooling: "mean", normalize: true });
  const dims = output.dims as number[];
  const data = Array.from(output.data as Float32Array | number[]);

  if (dims.length === 1) {
    // Single vector flattened as [dim]
    return [data];
  }
  if (dims.length === 2) {
    const [batch, dim] = dims;
    const vectors: number[][] = [];
    for (let i = 0; i < batch; i++) {
      vectors.push(data.slice(i * dim, (i + 1) * dim));
    }
    return vectors;
  }

  throw new Error(`Unexpected local embedding tensor shape: [${dims.join(", ")}]`);
}

async function getGeminiEmbeddings(
  texts: string[],
  taskType: EmbeddingTask,
): Promise<number[][]> {
  const client = getGeminiClient();
  const cleaned = texts.map(normalizeText);

  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await client.models.embedContent({
        model: GEMINI_MODEL,
        contents: cleaned.length === 1 ? cleaned[0] : cleaned,
        config: {
          taskType,
          outputDimensionality: GEMINI_DIMENSIONS,
        },
      });

      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== cleaned.length) {
        throw new Error(
          `Expected ${cleaned.length} embeddings, got ${embeddings.length} from ${GEMINI_MODEL}`,
        );
      }

      return embeddings.map((item) => {
        const values = item.values;
        if (!values?.length) throw new Error("Empty embedding returned from Gemini");
        return values;
      });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /429|RESOURCE_EXHAUSTED|rate|quota|Unavailable|503/i.test(message);
      if (!retryable || attempt === 5) break;
      const delayMatch = message.match(/retry in ([0-9.]+)s/i);
      const delayMs = delayMatch
        ? Math.ceil(Number(delayMatch[1]) * 1000) + 500
        : Math.min(60_000, 2000 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Embed one or more texts (local MiniLM by default; Gemini if EMBEDDING_PROVIDER=gemini). */
export async function getEmbeddings(
  texts: string[],
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (getEmbeddingProvider() === "gemini") {
    return getGeminiEmbeddings(texts, taskType);
  }
  return getLocalEmbeddings(texts);
}

export async function getEmbedding(
  text: string,
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
): Promise<number[]> {
  const [embedding] = await getEmbeddings([text], taskType);
  return embedding;
}
