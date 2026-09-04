/** Hard caps from Week 11 safety rules. */
export const MAX_ROWS_PER_QUERY = 50;

const SECRET_ENV_KEYS = [
  "EMAIL_PASSWORD",
  "EMAIL_USER",
  "MYSQL_PASSWORD",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
] as const;

/** Clamp any result set to ≤50 rows — never bulk-export MLS data. */
export function clampRows<T>(rows: readonly T[], max = MAX_ROWS_PER_QUERY): T[] {
  if (max < 1) return [];
  return rows.slice(0, Math.min(max, MAX_ROWS_PER_QUERY));
}

/** True when a row count would violate the ≤50 rule. */
export function exceedsRowLimit(count: number): boolean {
  return count > MAX_ROWS_PER_QUERY;
}

/**
 * Redact secrets before any log/preview output.
 * Never log EMAIL_PASSWORD or other credentials.
 */
export function redactSecrets(text: string): string {
  let out = text;
  // Generic patterns first
  out = out.replace(/(password|passwd|secret|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[REDACTED]");
  for (const key of SECRET_ENV_KEYS) {
    const value = process.env[key];
    if (value && value.length > 0) {
      out = out.split(value).join(`[REDACTED:${key}]`);
    }
  }
  return out;
}

export function safeLog(...args: unknown[]): void {
  const parts = args.map((a) =>
    typeof a === "string" ? redactSecrets(a) : redactSecrets(JSON.stringify(a)),
  );
  console.log(...parts);
}

/** Outbound email send requires explicit approval — never autonomous. */
export function assertSendAllowed(opts: {
  status: string;
  explicitApprove: boolean;
}): void {
  if (!opts.explicitApprove) {
    throw new Error(
      "Safety: send blocked. Pass --approve after reviewing the draft preview.",
    );
  }
  if (opts.status !== "approved" && opts.status !== "pending_approval") {
    throw new Error(`Safety: cannot send draft with status "${opts.status}".`);
  }
}
