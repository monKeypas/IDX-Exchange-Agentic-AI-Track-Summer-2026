# Week 9 Deliverable — Multi-Agent Orchestrator

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Single intelligent coordinator that analyzes each incoming query and routes it — or splits it across multiple agents — to produce one unified WhatsApp reply.

Lives at `openclaw/workspace/orchestrator/` (**beside** `skills/`, not inside it). Reuses all Week 2–8 skills as registered agents; adds `emailDraftAgent` for formatted summaries.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Agent registry (5 agents) | `agents.ts` |
| Intent classification | `classifyIntent.ts` |
| Parallel mixed routing | `orchestrate.ts` `mixed` case |
| Single OpenClaw entry point | `npm run orchestrate` |
| Mixed-intent tests | `tests/orchestrate.test.ts` |

## Agent registry

| Agent | Underlying skill |
| --- | --- |
| `propertySearchAgent` | `property-search` → `searchActiveListings` |
| `marketStatsAgent` | `market-stats` → `answerMarketQuestion` |
| `recommendationAgent` | `recommendations` → `recommendSimilarListings` |
| `ragAgent` | `rag` → `ragAnswer` |
| `emailDraftAgent` | listings and/or market content → `formatEmailDraft` |

## Orchestrator logic

```text
orchestrate(query, userId)
  → classifyIntent(query)
  → search      → propertySearchAgent
  → market      → marketStatsAgent
  → recommend   → recommendationAgent (session lastResults fallback)
  → knowledge   → ragAgent
  → email       → emailDraftAgent
  → mixed       → propertySearchAgent + marketStatsAgent in parallel → formatCombinedResponse
```

### Example (handbook)

**Query:** “Find me affordable homes in Pasadena and tell me whether prices are rising.”

**Intent:** `mixed`

**Agents:** `propertySearchAgent` + `marketStatsAgent` (parallel)

**Reply:** merged property listings + Pasadena market stats.

## How to Run

```bash
npm install
npm run rag:index          # if not already built (knowledge routes)
npm test
npm run orchestrate -- --user alice "Find me affordable homes in Pasadena and tell me whether prices are rising"
npm run orchestrate -- --user alice "What does DOM mean?"
```

## Key Files

| File | Role |
| --- | --- |
| `src/classifyIntent.ts` | Intent → agent routing |
| `src/agents.ts` | Five agent wrappers |
| `src/emailDraft.ts` | Email draft formatting |
| `src/orchestrate.ts` | Main coordinator |
| `scripts/run-orchestrator.ts` | CLI / WhatsApp entrypoint |

## Continuity

Weeks 2–8 remain as individual skills under `skills/` for direct CLI use. Week 9 is the **default WhatsApp entry point** at `orchestrator/` — OpenClaw should prefer `orchestrate` over manually picking a skill.
