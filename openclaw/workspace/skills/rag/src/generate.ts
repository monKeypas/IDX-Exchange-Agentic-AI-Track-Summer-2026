import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { RetrievedChunk } from "./retrieve.js";

const GEMINI_CHAT_MODEL = process.env.RAG_CHAT_MODEL?.trim() || "gemini-2.0-flash";

function resolveGeminiApiKey(): string {
  const fromEnv =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (fromEnv?.trim()) return fromEnv.trim();

  const configPath = join(homedir(), ".openclaw", "openclaw.json");
  if (!existsSync(configPath)) {
    throw new Error(
      "No Gemini API key found for RAG generation. Set GEMINI_API_KEY or OpenClaw Google apiKey.",
    );
  }
  const cfg = JSON.parse(readFileSync(configPath, "utf8")) as {
    plugins?: { entries?: { google?: { config?: { webSearch?: { apiKey?: string } } } } };
  };
  const fromOpenClaw = cfg.plugins?.entries?.google?.config?.webSearch?.apiKey?.trim();
  if (fromOpenClaw) return fromOpenClaw;
  throw new Error(
    "No Gemini API key found for RAG generation. Set GEMINI_API_KEY or OpenClaw Google apiKey.",
  );
}

export function buildRagPrompt(query: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.source}\n${c.chunk}`)
    .join("\n\n");
  return [
    "Answer using only the context below. If the context does not contain the answer, say you do not know from the indexed documents.",
    "Do not invent listings, prices, or live market statistics.",
    "If a Week 5 live market report is in the context and the question asks for a city number (DOM, price, list-to-close, inventory), lead with those report figures, then a short definition if useful. Do not invent other city stats.",
    "Keep the answer WhatsApp-friendly (plain text, no markdown tables or bullet stars).",
    "If the question asks for columns or a list, include every item present in the context — do not truncate with etc.",
    "",
    "Context:",
    context,
    "",
    `Question: ${query}`,
  ].join("\n");
}

export async function generateGroundedAnswer(
  query: string,
  chunks: RetrievedChunk[],
): Promise<string> {
  const client = new GoogleGenAI({ apiKey: resolveGeminiApiKey() });
  const prompt = buildRagPrompt(query, chunks);
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_CHAT_MODEL,
        contents: prompt,
      });
      const text = response.text?.trim();
      if (!text) throw new Error("Empty RAG generation response");
      return text;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /429|RESOURCE_EXHAUSTED|rate|quota|Unavailable|503/i.test(message);
      if (!retryable || attempt === 3) break;
      const delayMatch = message.match(/retry in ([0-9.]+)s/i);
      const delayMs = delayMatch
        ? Math.ceil(Number(delayMatch[1]) * 1000) + 250
        : Math.min(20_000, 2000 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
