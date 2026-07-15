#!/usr/bin/env npx tsx
import { handleConversationTurn } from "../src/conversation.js";
import { closePool } from "../src/mysql.js";

/**
 * Usage:
 *   npm run chat -- --user <userId> "<message>"
 *
 * For WhatsApp / OpenClaw: pass the peer phone (or channel peer id) as --user.
 * MySQL credentials are loaded automatically from the project `.env`.
 */

const args = process.argv.slice(2);
let userId = process.env.CHAT_USER_ID?.trim() || "local";
const messageParts: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--user" || args[i] === "-u") {
    userId = args[i + 1]?.trim() || userId;
    i += 1;
    continue;
  }
  messageParts.push(args[i]);
}

const message = messageParts.join(" ").trim();

if (!message) {
  console.error('Usage: npm run chat -- --user <userId> "<message>"');
  process.exit(1);
}

try {
  const result = await handleConversationTurn(userId, message);
  console.log(result.reply);
} finally {
  await closePool();
}
