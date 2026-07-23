import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  searchActiveListings,
  type ListingRow,
  type PropertyFilters,
} from "./mlsSearch.js";
import {
  emptyPropertyFilters,
  mergePropertyFilters,
  parseMaxPrice,
  parseMinPrice,
  parsePropertyQuery,
} from "./parsePropertyQuery.js";

// --- Session memory ---

export interface UserSession extends Partial<PropertyFilters> {
  lastResults?: ListingRow[];
  conversationStep: number;
}

const sessions = new Map<string, UserSession>();
const STORE_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", ".sessions.json");

function loadSessionsFromDisk() {
  if (!existsSync(STORE_PATH)) return;
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, UserSession>;
    for (const [userId, session] of Object.entries(raw)) sessions.set(userId, session);
  } catch {
    // Ignore corrupt store.
  }
}

function persistSessionsToDisk() {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const raw: Record<string, UserSession> = {};
  for (const [userId, session] of sessions.entries()) raw[userId] = session;
  writeFileSync(STORE_PATH, JSON.stringify(raw, null, 2));
}

loadSessionsFromDisk();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) sessions.set(userId, { conversationStep: 0 });
  return sessions.get(userId)!;
}

export function updateSession(userId: string, updates: Partial<UserSession>) {
  sessions.set(userId, { ...getSession(userId), ...updates });
  persistSessionsToDisk();
}

export function clearSession(userId: string) {
  sessions.delete(userId);
  persistSessionsToDisk();
}

/** Test helper — clears in-memory + disk store. */
export function resetAllSessions() {
  sessions.clear();
  if (existsSync(STORE_PATH)) writeFileSync(STORE_PATH, "{}");
}

// --- Conversation ---

export interface ConversationTurnResult {
  reply: string;
  ready: boolean;
  session: UserSession;
}

function titleCaseCity(city: string): string {
  return city
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function isValidCityName(city: string): boolean {
  return Boolean(city) && !/(bay area|any city|california|so\s*cal)/i.test(city);
}

function hasLocation(session: UserSession): boolean {
  return Boolean(session.city || session.zip);
}

function hasPriceBound(session: UserSession): boolean {
  return session.maxPrice != null || session.minPrice != null;
}

function hasPreferenceDetail(session: UserSession): boolean {
  return (
    session.type != null ||
    session.bedsMin != null ||
    session.bathsMin != null ||
    session.sqftMin != null ||
    session.lotSqftMin != null ||
    session.pool === true ||
    session.view === true ||
    session.fireplace === true ||
    session.garage === true ||
    session.spa === true ||
    session.newConstruction === true ||
    session.yearBuiltMin != null ||
    session.yearBuiltMax != null ||
    session.keywords != null ||
    session.subdivision != null ||
    session.highSchoolDistrict != null
  );
}

function isResetMessage(message: string): boolean {
  return /^(new search|start over|clear|reset|restart)$/i.test(message.trim());
}

export function isSearchReady(session: UserSession): boolean {
  return hasLocation(session) && hasPriceBound(session) && hasPreferenceDetail(session);
}

export function nextMissingQuestion(session: UserSession): string | null {
  if (!hasLocation(session)) return "What city or zip code should I search in?";
  if (!hasPriceBound(session)) {
    return "What is your budget? (e.g. under $1.2M or between $800k and $1.5M)";
  }
  if (!hasPreferenceDetail(session)) {
    return "Any preferences — type, beds/baths, pool, garage, year built, or keywords like waterfront?";
  }
  return null;
}

export async function parseConversationalUpdate(
  message: string,
): Promise<Partial<UserSession>> {
  const parsed = await parsePropertyQuery(message);
  const updates = mergePropertyFilters({}, parsed) as Partial<UserSession>;

  if (parsed.city && !isValidCityName(parsed.city)) delete updates.city;
  else if (updates.city) updates.city = titleCaseCity(updates.city);

  if (updates.maxPrice == null) {
    const maxPrice = parseMaxPrice(message);
    if (maxPrice != null) updates.maxPrice = maxPrice;
  }
  if (updates.minPrice == null) {
    const minPrice = parseMinPrice(message);
    if (minPrice != null) updates.minPrice = minPrice;
  }

  const trimmed = message.trim();
  if (!updates.city && /^\d{5}$/.test(trimmed)) updates.zip = trimmed;

  if (!updates.city) {
    const looksLikeCity =
      /^[A-Za-z][A-Za-z\s.'-]{1,40}$/.test(trimmed) &&
      !/(bed|bath|condo|townhome|single family|land|pool|view|under|budget|million|city|garage|hoa)/i.test(
        trimmed,
      ) &&
      isValidCityName(trimmed);
    if (looksLikeCity) updates.city = titleCaseCity(trimmed);
  }

  return updates;
}

function sessionToFilters(session: UserSession): PropertyFilters {
  const filters = emptyPropertyFilters();
  for (const key of Object.keys(filters) as (keyof PropertyFilters)[]) {
    const value = session[key];
    if (value != null) (filters as Record<string, unknown>)[key] = value;
  }
  return filters;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatListingResults(rows: ListingRow[]): string {
  if (rows.length === 0) {
    return "No active listings matched those filters. Want to adjust budget, beds, zip, or add keywords?";
  }

  const lines = rows.map((row, index) => {
    const address =
      [row.L_Address, row.L_City, row.L_Zip].filter(Boolean).join(", ") || "Address unavailable";
    const beds = row.beds != null ? `${row.beds} bd` : "beds N/A";
    const baths = row.baths != null ? `${row.baths} ba` : "baths N/A";
    const photos = row.PhotoCount != null ? `${row.PhotoCount} photos` : "photos N/A";
    return `${index + 1}) ${address}\n${formatCurrency(row.price)} · ${beds} / ${baths} · ${photos}`;
  });

  return `Here are ${rows.length} active listings:\n\n${lines.join("\n\n")}`;
}

function summarizeSession(session: UserSession): string {
  const parts = [
    session.city ? `city=${session.city}` : null,
    session.zip ? `zip=${session.zip}` : null,
    session.minPrice != null ? `min=${formatCurrency(session.minPrice)}` : null,
    session.maxPrice != null ? `max=${formatCurrency(session.maxPrice)}` : null,
    session.type ? `type=${session.type}` : null,
    session.bedsMin != null && session.bedsMax === session.bedsMin
      ? `beds=${session.bedsMin}`
      : session.bedsMin != null
        ? `beds>=${session.bedsMin}`
        : null,
    session.bathsMin != null ? `baths>=${session.bathsMin}` : null,
    session.sqftMin != null ? `sqft>=${session.sqftMin}` : null,
    session.yearBuiltMin != null ? `built>=${session.yearBuiltMin}` : null,
    session.pool ? "pool" : null,
    session.garage ? "garage" : null,
    session.keywords ? `keywords=${session.keywords}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export async function handleConversationTurn(
  userId: string,
  message: string,
): Promise<ConversationTurnResult> {
  const text = message.trim();
  if (!text) {
    return {
      reply: "Tell me what kind of home you're looking for (city/zip, budget, beds/type).",
      ready: false,
      session: getSession(userId),
    };
  }

  if (isResetMessage(text)) {
    clearSession(userId);
    return {
      reply: "Okay — starting a new search. What city or zip should I look in?",
      ready: false,
      session: getSession(userId),
    };
  }

  const updates = await parseConversationalUpdate(text);
  const current = getSession(userId);
  updateSession(userId, {
    ...updates,
    conversationStep: (current.conversationStep ?? 0) + 1,
  });

  let session = getSession(userId);

  if (!isSearchReady(session)) {
    const question = nextMissingQuestion(session)!;
    const known = summarizeSession(session);
    return {
      reply: `${known ? `Got it (${known}). ` : ""}${question}`,
      ready: false,
      session,
    };
  }

  const { rows } = await searchActiveListings(sessionToFilters(session), 1, 10);
  updateSession(userId, { lastResults: rows });
  session = getSession(userId);

  return {
    reply: [
      `Searching active listings for: ${summarizeSession(session)}`,
      "",
      formatListingResults(rows),
      "",
      'Reply with tweaks (zip, exact beds, garage, year built, keywords), or say "new search".',
    ].join("\n"),
    ready: true,
    session,
  };
}
