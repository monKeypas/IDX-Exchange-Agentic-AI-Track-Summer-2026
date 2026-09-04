#!/usr/bin/env npx tsx
/**
 * Week 11 email agent CLI — draft-then-approve only.
 *
 * Draft (never sends):
 *   npm run email:draft -- --type market --to you@example.com --city Pasadena
 *   npm run email:draft -- --type listings --to you@example.com --query "homes in Irvine under 1m"
 *   npm run email:draft -- --type summary --to you@example.com --query "condo in Pasadena under 900k"
 *   npm run email:draft -- --type recommend --to you@example.com --query "I like 257 Fay Way, find similar"
 *
 * Preview / list:
 *   npm run email:preview -- --list
 *   npm run email:preview -- --id <draftId>
 *
 * Send (REQUIRES --approve):
 *   npm run email:send -- --id <draftId> --approve
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatDraftPreview, markApproved } from "../src/draftEmail.js";
import { getDraft, listDrafts, updateDraft } from "../src/draftStore.js";
import {
  draftListingAlert,
  draftPropertySummary,
  draftRecommendationDigest,
  draftWeeklyMarketReport,
} from "../src/emailAgent.js";
import { sendApprovedEmail } from "../src/sendEmail.js";
import { closePool as closeMarketPool } from "../../market-stats/src/mysql.js";
import { closePool as closeSearchPool } from "../../property-search/src/mysql.js";
import { closePool as closeRecommendPool } from "../../recommendations/src/mysql.js";

function loadProjectEnv() {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
  const envPath = resolve(projectRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadProjectEnv();

const args = process.argv.slice(2);
const cmd = args[0] === "draft" || args[0] === "preview" || args[0] === "send"
  ? args.shift()!
  : "draft";

function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

async function runDraft() {
  const type = flag("--type") ?? "market";
  const to = flag("--to");
  if (!to) {
    console.error("Missing --to <email>");
    process.exit(1);
  }

  let result;
  if (type === "market") {
    const city = flag("--city") ?? flag("--query");
    if (!city) {
      console.error('Missing --city "Pasadena"');
      process.exit(1);
    }
    result = await draftWeeklyMarketReport({ to, city });
  } else if (type === "listings") {
    const query = flag("--query");
    if (!query) {
      console.error('Missing --query "homes in Irvine under 1m"');
      process.exit(1);
    }
    result = await draftListingAlert({ to, query });
  } else if (type === "summary") {
    const query = flag("--query");
    if (!query) {
      console.error('Missing --query "..."');
      process.exit(1);
    }
    result = await draftPropertySummary({ to, query });
  } else if (type === "recommend") {
    const query = flag("--query");
    if (!query) {
      console.error('Missing --query "I like ..., find similar"');
      process.exit(1);
    }
    result = await draftRecommendationDigest({ to, query });
  } else {
    console.error(`Unknown --type ${type}. Use market|listings|summary|recommend`);
    process.exit(1);
  }

  console.log(result.preview);
  console.log(`\nQueued draft id: ${result.draft.id} (status: ${result.status})`);
}

async function runPreview() {
  if (hasFlag("--list")) {
    const drafts = listDrafts();
    if (drafts.length === 0) {
      console.log("No drafts in queue.");
      return;
    }
    for (const d of drafts) {
      console.log(`${d.id}  ${d.status}  ${d.useCase}  → ${d.to}  | ${d.subject}`);
    }
    return;
  }
  const id = flag("--id");
  if (!id) {
    console.error("Missing --id <draftId> (or use --list)");
    process.exit(1);
  }
  const draft = getDraft(id);
  if (!draft) {
    console.error(`Draft not found: ${id}`);
    process.exit(1);
  }
  console.log(formatDraftPreview(draft));
}

async function runSend() {
  const id = flag("--id");
  if (!id) {
    console.error("Missing --id <draftId>");
    process.exit(1);
  }
  const draft = getDraft(id);
  if (!draft) {
    console.error(`Draft not found: ${id}`);
    process.exit(1);
  }

  const explicitApprove = hasFlag("--approve");
  if (!explicitApprove) {
    console.error(
      "Safety: send blocked. Review the draft, then re-run with --approve:\n" +
        `  npm run email:send -- --id ${id} --approve`,
    );
    process.exit(1);
  }

  const approved = markApproved(draft);
  updateDraft(approved);
  const sent = await sendApprovedEmail(approved, { explicitApprove: true });
  updateDraft(sent);
  console.log(`Sent draft ${sent.id} to ${sent.to} at ${sent.sentAt}`);
}

try {
  if (cmd === "draft") await runDraft();
  else if (cmd === "preview") await runPreview();
  else if (cmd === "send") await runSend();
  else {
    console.error("Usage: email:draft | email:preview | email:send");
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await Promise.all([closeSearchPool(), closeMarketPool(), closeRecommendPool()]);
}
