# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Course project for the IDX Exchange Agentic AI Track (Summer 2026), team monKeypas. An OpenClaw agent
answers real-estate questions over WhatsApp by routing them to skills that query an MLS MySQL
database. Work ships as weekly deliverables: each `docs/week-N-*.md` write-up pairs with code under
`openclaw/workspace/`. Weeks 2–4 built property search, 5 market stats, 6 semantic search,
7 recommendations, 8 RAG, 9–10 the orchestrator and WhatsApp layer, 11 the email agent.

## Commands

```bash
npm install
npm test                       # vitest run — all 12 files, no DB or network needed
npx vitest run <path>          # single file
npx vitest run -t "<name>"     # single test by name
npx tsc --noEmit               # typecheck; tsconfig includes openclaw/ only

# Per-skill entry points. `--` is required so args reach the script.
npm run parse -- "3 bedroom condo in Irvine under 1.5m"            # parser only, no DB
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"       # needs .env
npm run chat -- --user alice "Find homes in Irvine"                # multi-turn, persists session
npm run market -- "Is now a good time to buy in San Diego?"
npm run embed:build -- --limit 500                                 # build embedding cache first
npm run search:semantic -- "charming craftsman with mountain views"
npm run recommend -- "I like 257 Fay Way, find similar homes"
npm run rag:index && npm run rag -- "What does DOM mean?"          # index before querying
npm run email:draft -- --type market --to you@example.com --city Pasadena
npm run email:send -- --id <draftId> --approve

# Everything through the real router:
npm run orchestrate -- --user alice "Find homes in Pasadena and whether prices are rising"
```

No build step and no linter. TypeScript is `noEmit`; `tsx` runs sources directly.

`npm test` passes with no `.env` and no network because every test targets pure functions — query
*builders* (`buildActiveListingsQuery` returns `{sql, params}`), formatters, and the intent
classifier. There are no mocks and nothing hits MySQL. Keep that property when adding tests: put I/O
behind a pure function and test that. One exception: `semantic-search/tests/embeddings.local.test.ts`
loads the MiniLM model and takes ~25s, which dominates the suite's runtime.

## Architecture

### Orchestrator vs. skills

`openclaw/workspace/orchestrator/` is a coordinator, deliberately **not** a skill and not under
`skills/`. It is the single WhatsApp entry point:

```
WhatsApp → onWhatsAppMessage() → orchestrate() → classifyIntent() → agent(s) → MySQL → reply
```

[classifyIntent.ts](openclaw/workspace/orchestrator/src/classifyIntent.ts) is regex-based, returning
`search | market | recommend | knowledge | email | email_approve | semantic | mixed | unknown`.
Several ordering rules in it are load-bearing: approval is checked first (it acts on an existing
draft and must never create one), search+market together yields `mixed` (both agents run via
`Promise.all`, merged under `Property search` / `Market stats` headers), a leading "what does/is/are"
sets a `definitional` flag that suppresses the market match so "What does DOM mean?" routes to RAG,
and `semantic` is the last resort before `unknown` so descriptive prose reaches embedding search
while structured filters still win. Keyword regexes must cover plurals — `\bbedroom\b` does not
match "bedrooms", which silently broke multi-turn refinements. Adding a keyword to one of those regexes can silently re-route existing queries —
[orchestrate.test.ts](openclaw/workspace/orchestrator/tests/orchestrate.test.ts) pins the expected
routing.

[agents.ts](openclaw/workspace/orchestrator/src/agents.ts) is the only place skills are imported
directly as TypeScript (relative paths into `../../skills/*/src/`). All seven agents return the same
`{agent, reply}` shape, so the orchestrator never formats domain data itself. `emailDraftAgent`
persists to the shared draft queue so `emailApprovalAgent` has a concrete draft to send; the two
together are the WhatsApp half of the Week 11 approval gate, and `assertSendAllowed` still enforces
it at the boundary.

### The two calling conventions

Skills are reachable two ways, and both must keep working:

1. **The OpenClaw agent shells out** — it reads `SKILL.md` and runs the matching `npm run` script,
   then relays stdout. A new skill needs its `SKILL.md` workflow block *and* a `scripts` entry in
   root `package.json`; the agent cannot import `src/`.
2. **The orchestrator imports `src/` directly**, bypassing the scripts entirely.

So a change to a skill's script output affects the agent path only, and a change to its exported
functions affects the orchestrator path only. `orchestrator/README.md` and the `SKILL.md` files are
prompt context, not developer docs — `README.md` there instructs the agent to relay stdout verbatim
and never reference prior messages, so wording changes there change agent behavior.

### Data layer

Two MySQL tables: `rets_property` (active listings) and `california_sold` (comps, market stats).

Four skills each contain a **byte-identical** `src/mysql.ts` (property-search, market-stats,
semantic-search, recommendations). It hand-rolls a `.env` loader — no `dotenv` dependency — walking
up five directories to the project root for `MYSQL_HOST/USER/PASSWORD/DATABASE`, then exports a
pooled `query()`. `.env.example` documents every variable the repo reads. Fix any bug in
that loader in all four copies, or consolidate deliberately.

All SQL is parameterized through `query(sql, params)`. Boolean MLS columns are stringly-typed, so
`ynClause()` in [mlsSearch.ts](openclaw/workspace/skills/property-search/src/mlsSearch.ts) matches
`'True' | '1' | 'Yes'` rather than comparing to a boolean.

**`toRetsFilters()` is vestigial.** It survives from Week 2 and is now called only by
`scripts/parse-query.ts` and its test — it is *not* how queries reach the database. Real SQL is built
by `appendPropertyFilterClauses()` in `mlsSearch.ts`, which covers far more of `PropertyFilters`
(county, subdivision, year built, HOA, garage/spa/fireplace, school district) than the small
`toRetsFilters` mapping. Extend the clause builder when adding a filter; don't assume the two agree.

`PropertyFilters` is the shared vocabulary across search, session memory, and recommendations. Fields
are nullable and range-shaped (`bedsMin`/`bedsMax`, `minPrice`/`maxPrice`) so a follow-up turn can
merge new constraints over old ones; `bedsMin === bedsMax` is how "exactly 4 beds" is expressed.
Always build one via `emptyPropertyFilters()` so new fields default to null everywhere.

### Local caches

Four regenerable stores, all gitignored, all written beside their skill:

| Path | Built by | Notes |
|---|---|---|
| `property-search/.sessions.json` | `npm run chat` | Per-user filters + `lastResults`; loaded at import time |
| `semantic-search/.embeddings/` | `npm run embed:build` | Stamped with model + dimensions |
| `rag/.index/chunks.json` | `npm run rag:index` | Chunked from `rag/knowledge/*.md` |
| `email-agent/.drafts/` | `npm run email:draft` | Pending human approval |

Embeddings default to local MiniLM (384-d, no API quota); `EMBEDDING_PROVIDER=gemini` switches to
`gemini-embedding-001` (768-d). The cache records which model built it and `embeddingStore.ts` fails
fast on mismatch, so switching providers requires a full `embed:build` rebuild.

Session state is keyed by the WhatsApp peer id passed as `--user`, which is what lets
`recommendationAgent` fall back to the user's last search result when the query says "find similar"
without naming a property.

### Email safety (Week 11)

[guardrails.ts](openclaw/workspace/skills/email-agent/src/guardrails.ts) is the deliverable, not
incidental plumbing: `assertSendAllowed()` throws unless `--approve` is passed explicitly, so nothing
sends autonomously; `clampRows()` caps any result set at 50 rows to prevent bulk MLS export; and
`redactSecrets()`/`safeLog()` scrub credentials from previews and logs. Preserve these invariants
when touching the email path.

## Agent workspace

`openclaw/workspace/*.md` (`AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`,
`HEARTBEAT.md`) is not source — it is the OpenClaw runtime home directory loaded as prompt context,
so editing it changes agent behavior. `HEARTBEAT.md` is intentionally comments-only; adding real
content enables scheduled heartbeat API calls.

OpenClaw's live config lives at `~/.openclaw/openclaw.json`, outside the repo;
`openclaw/config/openclaw.json.example` is the tracked template and needs
`agents.defaults.workspace` set to the absolute path of `openclaw/workspace/`. Credentials, the live
config, and session history stay under `~/.openclaw/` and are never committed.
