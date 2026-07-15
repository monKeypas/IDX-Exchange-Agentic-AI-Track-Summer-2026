import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ListingRow } from "./mlsSearch.js";
import type { PropertyFilters } from "./propertyFilters.js";

export interface UserSession extends Partial<PropertyFilters> {
  lastResults?: ListingRow[];
  conversationStep: number;
}

const sessions = new Map<string, UserSession>();

const STORE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".sessions.json",
);

function loadSessionsFromDisk() {
  if (!existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, UserSession>;
    for (const [userId, session] of Object.entries(raw)) {
      sessions.set(userId, session);
    }
  } catch {
    // Ignore corrupt store; start fresh.
  }
}

function persistSessionsToDisk() {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const raw: Record<string, UserSession> = {};
  for (const [userId, session] of sessions.entries()) {
    raw[userId] = session;
  }
  writeFileSync(STORE_PATH, JSON.stringify(raw, null, 2));
}

loadSessionsFromDisk();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, { conversationStep: 0 });
  }
  return sessions.get(userId)!;
}

export function updateSession(userId: string, updates: Partial<UserSession>) {
  const session = getSession(userId);
  sessions.set(userId, { ...session, ...updates });
  persistSessionsToDisk();
}

export function clearSession(userId: string) {
  sessions.delete(userId);
  persistSessionsToDisk();
}

/** Test helper — clears in-memory + disk store. */
export function resetAllSessions() {
  sessions.clear();
  if (existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "{}");
  }
}
