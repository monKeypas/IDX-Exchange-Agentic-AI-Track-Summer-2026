# Orchestrator (Week 9)

Single intelligent **coordinator** — not a domain skill. Lives beside `skills/` and routes each WhatsApp query to the right agent(s).

Do **not** invent listings or stats. Always run this script and relay **stdout verbatim**.

## Reply rules (WhatsApp)

- Send the script output **exactly** — do not paraphrase, bullet-format, or shorten.
- **Never** refer to prior messages (“as I mentioned previously”, “still waiting for your criteria”). Each query gets a fresh full answer from the script.
- Mixed queries must always show **both** sections: `Property search` and `Market stats` — never replace the market half with a callback.

## Agent registry

| Agent | When |
|-------|------|
| `propertySearchAgent` | Find homes with beds/baths/price/city filters |
| `marketStatsAgent` | Market trends, DOM, list-to-close, buy timing |
| `recommendationAgent` | “I like X, find similar” (uses session `lastResults` if needed) |
| `ragAgent` | Definitions, MLS columns, disclosures |
| `emailDraftAgent` | Email-style summary of listings and/or market data |

Mixed queries (search **and** market) run **both** agents in parallel and merge the reply.

## WhatsApp / OpenClaw workflow

```bash
cd <project-root> && npm run orchestrate -- --user <PEER_ID> "<USER_MESSAGE_TEXT>"
```

Use the WhatsApp peer id as `--user` so recommendation can reuse recent search results.

## Example queries

- `Find me affordable homes in Pasadena and tell me whether prices are rising` → **mixed**
- `What does DOM mean?` → **knowledge** (RAG)
- `I like 29500 Heathercliff, find similar` → **recommend**
- `3 bed condo in Irvine under 1.5m` → **search**
- `Market stats for San Diego` → **market**
- `Draft an email about Irvine listings` → **email**

## Prerequisites

- MySQL `.env` (same as skills)
- RAG index for knowledge questions: `npm run rag:index`
- Semantic listing cache for recommendations: `npm run embed:build` (if not already built)

## Commands

```bash
npm run orchestrate -- --user alice "Find affordable homes in Pasadena and tell me whether prices are rising"
npm run orchestrate -- --user alice --json "What does DOM mean?"
```

## Source files

```
openclaw/workspace/orchestrator/   # coordinator (outside skills/)
├── README.md
├── src/
│   ├── classifyIntent.ts
│   ├── agents.ts
│   ├── emailDraft.ts
│   └── orchestrate.ts
├── scripts/
│   └── run-orchestrator.ts
└── tests/
```
