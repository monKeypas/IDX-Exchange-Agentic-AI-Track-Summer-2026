# Week 8 Deliverable — Retrieval-Augmented Generation (RAG)

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Document-aware RAG assistant that answers questions about real estate concepts, MLS field definitions, and market terminology by retrieving indexed source chunks and generating an answer **only from that context**.

Uses Week 6 local MiniLM embeddings for chunk + query vectors (no listing index). Generation uses Gemini (same key family as OpenClaw) instead of the handbook’s `gpt-4o-mini` sample; the pipeline is the same. If Gemini chat quota is exhausted, answers fall back to extractive quotes from retrieved chunks.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Chunk documents (900 / overlap 120; handbook sample used 600/100) | `chunk.ts` |
| Embed + index chunks | `retrieve.ts` `indexDocuments` + `.index/chunks.json` |
| Retrieve top 4 by cosine | `retrieve.ts` |
| Grounded generation | `generate.ts` + `rag.ts` |
| Knowledge sources | `knowledge/*.md` |
| OpenClaw skill | `skills/rag/` |
| Example Qs | `npm run rag -- "What does DOM mean?"` |

## Knowledge sources

| Document | Content |
| --- | --- |
| `mls-field-definitions.md` | Column mappings for `rets_property` and `california_sold` |
| `idx-internal.md` | IDX Exchange skills, tables, routing |
| `real-estate-glossary.md` | DOM, escrow, comps, cap rate, list-to-close, etc. |
| `ca-real-estate-law.md` | CA disclosure / law summaries (not legal advice) |
| `market-reports.md` | How to read Week 5 metrics |
| Live Week 5 agent | `fetchWeek5MarketChunk` calls `answerMarketQuestion` when the query names a city |

## Pipeline

```text
rag:index  →  load knowledge/*.md  →  chunk  →  embed  →  save .index/chunks.json
rag        →  embed query  →  cosine top 4
           →  if city market question: call Week 5 answerMarketQuestion
           →  Gemini “answer using only context” (docs + live report)
```

## How to Run

```bash
npm install
npm run rag:index
npm test
npm run rag -- "What does DOM mean?"
npm run rag -- "What columns are in california_sold?"
npm run rag -- "What is a list-to-close ratio?"
```

## Key Files

| File | Role |
| --- | --- |
| `src/chunk.ts` | Overlapping character chunks |
| `src/retrieve.ts` | Index + retrieve |
| `src/generate.ts` | Grounded Gemini prompt |
| `src/rag.ts` | End-to-end answer + sources |
| `scripts/index-rag.ts` | Build index |
| `scripts/run-rag.ts` | CLI / WhatsApp entrypoint |

## Continuity

Week 8 explains MLS fields and terms from documents. When the question names a city, it **sources a live market report via the Week 5 market analytics agent** and grounds the answer in that report plus the docs. Week 6 embeddings are reused for retrieval only (separate RAG index, not listing vectors).
