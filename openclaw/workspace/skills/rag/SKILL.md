---
name: rag
description: "Document-aware RAG assistant for real estate concepts, MLS field definitions, and market terminology. Use for What does DOM mean?, What columns are in california_sold?, What is a list-to-close ratio?, and city metric questions (pulls a live Week 5 market report into context). Not for listing search (property-search), vibe search (semantic-search), or similar-homes (recommendations)."
---

# RAG (Document Q&A)

Use when the user asks **what something means** — MLS columns, DOM, escrow, comps, cap rate, list-to-close, California disclosures — or a **city metric** that should be grounded in a live Week 5 market report. Do not use for listing search.

Do **not** invent definitions. Always run the skill script and relay stdout.

## Prerequisites

1. Indexed knowledge docs (gitignored `.index/chunks.json`):

```bash
cd <project-root> && npm run rag:index
```

Uses the same local MiniLM embeddings as Week 6 (no listing cache required). Generation uses Gemini chat (OpenClaw Google key / `GEMINI_API_KEY`); if chat quota is exhausted, the skill quotes retrieved source chunks instead.

## WhatsApp / OpenClaw workflow

```bash
cd <project-root> && npm run rag -- "<USER_MESSAGE_TEXT>"
```

Send stdout back to WhatsApp (plain text).

## Example questions

- `What does DOM mean?`
- `What columns are in california_sold?`
- `What is a list-to-close ratio?`
- `What disclosures are required in California?`

City metric questions (e.g. average DOM in San Diego) still use this skill: it retrieves glossary/docs **and** calls the Week 5 market-stats agent for a live report. A full “is now a good time to buy in X?” dump can also go to `market-stats` directly.

## Commands

```bash
npm run rag:index
npm run rag -- "What does DOM mean?"
npm run rag -- --json "What columns are in california_sold?"
npm run rag -- "What is the average DOM in San Diego?"
```

## Source files

```
rag/
├── SKILL.md
├── knowledge/             # source documents
├── .index/                # chunk embeddings (gitignored)
├── src/
│   ├── chunk.ts
│   ├── ragStore.ts
│   ├── retrieve.ts
│   ├── generate.ts
│   ├── marketReport.ts    # Week 5 live report into context
│   └── rag.ts
├── scripts/
│   ├── index-rag.ts
│   └── run-rag.ts
└── tests/
```
