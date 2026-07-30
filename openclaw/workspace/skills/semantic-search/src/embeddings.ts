import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

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

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: resolveGeminiApiKey() });
}

function normalizeText(text: string): string {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 8000);
}

/** Embed one or more texts with Gemini (retries on 429 rate limits). */
export async function getEmbeddings(
  texts: string[],
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getClient();
  const cleaned = texts.map(normalizeText);

  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: cleaned.length === 1 ? cleaned[0] : cleaned,
        config: {
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });

      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== cleaned.length) {
        throw new Error(
          `Expected ${cleaned.length} embeddings, got ${embeddings.length} from ${EMBEDDING_MODEL}`,
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

export async function getEmbedding(
  text: string,
  taskType: EmbeddingTask = "SEMANTIC_SIMILARITY",
): Promise<number[]> {
  const [embedding] = await getEmbeddings([text], taskType);
  return embedding;
}
