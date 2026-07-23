---
name: property-search
description: "Multi-turn conversational MLS search with session memory. Parse preferences, ask for missing fields, query rets_property, return WhatsApp-ready listing cards."
---

# Property Search

Use for real-estate search over WhatsApp (or CLI). This skill keeps **per-user session memory**, asks only for missing filters, and returns active listings from `rets_property`.

## WhatsApp / OpenClaw workflow

On each inbound property-search message:

1. Identify the WhatsApp peer id (phone / channel peer) as `userId`.
2. Run a chat turn from the **git project root** (the folder that contains `package.json`).
   Do not `source .env` from the workspace folder — the script loads `.env` itself:

```bash
cd <project-root> && npm run chat -- --user "<WHATSAPP_PEER_ID>" "<USER_MESSAGE_TEXT>"
```

3. Send the script stdout back to the user on WhatsApp (plain text — no markdown tables).

Do **not** invent listings. Always run the chat script and relay its reply.

### Reset

If the user says `new search`, `start over`, `clear`, or `reset`, the skill clears that user's session.

## Conversation rules

Search runs when the session has:

- **location** — city **or** zip
- **budget** — `minPrice` and/or `maxPrice`
- **and** at least one preference: type, beds/baths, sqft, pool, garage, year built, keywords (waterfront, river, etc.), subdivision, school district, HOA cap, and more

Ask only for the next missing field. Accept several preferences in one message.

Supported filter examples:

- `95129` or `zip 95129`
- `between $2.5M and $3M`
- `exactly 4 beds`
- `built after 2010`, `new construction`
- `with garage`, `pool`, `spa`, `fireplace`, `view`
- `hoa under 400`
- `waterfront`, `near river`, `lake`, `golf`
- `1800 sqft`, `5000 sqft lot`
- `Irvine Unified school district`

Example:

- User: "Find homes in Irvine"
- Agent: "What is your budget?"
- User: "Under $1.2M"
- Agent: "Any preferences — condo, townhome, or single family? ..."
- User: "Single family with at least 3 beds"
- Agent: returns active listings

## Result format

Each listing includes:

- address
- price
- beds / baths
- photo count

Up to 10 active listings, lowest price first. Sold comps are **off** by default for this flow.

## Sold comps toggle

Week 3 sold-comps code remains available. Toggle in `src/mlsSearch.ts`:

```ts
export const INCLUDE_SOLD_COMPS = false; // set true to include california_sold in search:mls
```

Conversational WhatsApp search always uses **active listings only**.

## Other commands (non-conversational)

```bash
# Parse filters only (Week 2)
npm run parse -- "3 bedroom condo in Irvine under 1.5m"

# One-shot MLS search JSON (Week 3) — respects INCLUDE_SOLD_COMPS
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"
```

## Environment variables

```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=idx_exchange
```

## Source files

```
property-search/
├── SKILL.md
├── src/
│   ├── parsePropertyQuery.ts   # Week 2 NLP + filter model
│   ├── mysql.ts                # Week 3 MySQL pool
│   ├── mlsSearch.ts            # Week 3 queries + cards
│   └── session.ts              # Week 4 session + multi-turn
├── scripts/
│   ├── parse-query.ts
│   ├── search-mls.ts
│   └── chat-turn.ts
└── tests/
```
