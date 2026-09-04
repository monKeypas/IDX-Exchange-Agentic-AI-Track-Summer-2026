import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailDraft } from "./types.js";

const STORE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".drafts");
const STORE_PATH = join(STORE_DIR, "queue.json");

function ensureStore(): Record<string, EmailDraft> {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "{}");
    return {};
  }
  return JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, EmailDraft>;
}

function saveStore(store: Record<string, EmailDraft>) {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function saveDraft(draft: EmailDraft): EmailDraft {
  const store = ensureStore();
  store[draft.id] = draft;
  saveStore(store);
  return draft;
}

export function getDraft(id: string): EmailDraft | null {
  const store = ensureStore();
  return store[id] ?? null;
}

export function listDrafts(): EmailDraft[] {
  return Object.values(ensureStore()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export function updateDraft(draft: EmailDraft): EmailDraft {
  return saveDraft(draft);
}
