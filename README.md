# IDX Exchange — Agentic AI Track · Summer 2026

OpenClaw-powered multi-agent system for IDX Exchange, integrating WhatsApp messaging with MLS database skills.

**Team:** monKeypas

Each week has a short summary here and a full write-up under [`docs/`](docs/).

---

## Week 1 — Architecture

📄 **[OpenClaw Architecture Fundamentals](docs/week-1-openclaw-architecture.md)**

Workflow diagrams: WhatsApp → OpenClaw skills → MLS → reply.

---

## Week 2 — Natural Language Search

📄 **[Natural Language Property Search](docs/week-2-natural-language-property-search.md)**  
Code: `openclaw/workspace/skills/property-search/`

Parses free-text queries into structured `rets_property` filters.

```bash
npm install && npm test
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

---

## Week 3 — MLS Database Integration

📄 **[MLS Database Integration](docs/week-3-mls-database-integration.md)**  
Code: `openclaw/workspace/skills/property-search/`

Parameterized MySQL search + property cards (`rets_property`, optional `california_sold`).

```bash
# Requires project-root .env (MYSQL_*)
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"
```

---

## Week 4 — Conversational Search

📄 **[Conversational Property Search](docs/week-4-conversational-property-search.md)**  
Code: `openclaw/workspace/skills/property-search/`

Multi-turn session memory; returns address, price, beds/baths, photo count.

```bash
npm run chat -- --user alice "Find homes in Irvine"
npm run chat -- --user alice "Under $1.2M"
npm run chat -- --user alice "Single family with at least 3 beds"
```

---

## Week 5 — Market Statistics

📄 **[Market Statistics Agent](docs/week-5-market-statistics-agent.md)**  
Code: `openclaw/workspace/skills/market-stats/`

Answers market questions from `california_sold`: median/avg price, $/sqft, DOM, list-to-close, trends, YoY, inventory.

```bash
npm run market -- "Is now a good time to buy in San Diego?"
npm run market -- "What is the average price per sq ft in Pasadena?"
```

---

## Week 6 — Embeddings & Vector Search

📄 **[Embeddings & Vector Search](docs/week-6-embeddings-vector-search.md)**  
Code: `openclaw/workspace/skills/semantic-search/`

Semantic search over listing remarks via **local** MiniLM embeddings (default; no API quota) + cosine similarity (top 5). Optional Gemini via `EMBEDDING_PROVIDER=gemini`.

```bash
npm run embed:build -- --limit 500    # dev subset; omit --limit for all active
npm run search:semantic -- "charming craftsman with mountain views and character"
```

---

## Week 7 — Hybrid Recommendations

📄 **[Hybrid Recommendations](docs/week-7-hybrid-recommendations.md)**  
Code: `openclaw/workspace/skills/recommendations/`

Given a liked property (free text), rank top 5 similar active listings with structured + embedding hybrid scores and `california_sold` comp checks.

```bash
npm run recommend -- "I like 257 Fay Way in Mountain View, find similar homes"
```

---

## Week 8 — Retrieval-Augmented Generation (RAG)

📄 **[RAG](docs/week-8-rag.md)**  
Code: `openclaw/workspace/skills/rag/`

Grounded answers to MLS / terminology questions from indexed source documents (DOM, california_sold columns, list-to-close, disclosures).

```bash
npm run rag:index
npm run rag -- "What does DOM mean?"
```

---

## Week 9 — Multi-Agent Orchestrator

📄 **[Orchestrator](docs/week-9-orchestrator.md)**  
Code: `openclaw/workspace/skills/orchestrator/`

Single WhatsApp entry point — routes to property search, market stats, recommendations, RAG, or email draft; runs search + market in parallel for mixed queries.

```bash
npm run orchestrate -- --user alice "Find affordable homes in Pasadena and tell me whether prices are rising"
```

---

## Repository Structure

```
├── docs/                              # One write-up per week
│   ├── week-1-…md … week-9-….md
├── openclaw/
│   ├── config/openclaw.json.example
│   └── workspace/
│       ├── AGENTS.md, SOUL.md, ...
│       └── skills/
│           ├── property-search/       # Weeks 2–4
│           ├── market-stats/          # Week 5
│           ├── semantic-search/       # Week 6
│           ├── recommendations/       # Week 7
│           ├── rag/                   # Week 8
│           └── orchestrator/          # Week 9
├── package.json
└── README.md
```

---

## Quick commands (from git project root)

```bash
npm run parse -- "3 bedroom condo in Irvine under 1.5m"          # Week 2
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"     # Week 3
npm run chat -- --user alice "Find homes in Irvine"              # Week 4
npm run market -- "Is now a good time to buy in San Diego?"      # Week 5
npm run embed:build -- --limit 500                               # Week 6 index
npm run search:semantic -- "charming craftsman with mountain views"  # Week 6
npm run recommend -- "I like 257 Fay Way, find similar homes"    # Week 7
npm run rag:index                                                # Week 8 index
npm run rag -- "What does DOM mean?"                             # Week 8
npm run orchestrate -- --user alice "Find homes in Pasadena and whether prices are rising"  # Week 9
```

---

## OpenClaw Setup

```bash
git clone https://github.com/monKeypas/IDX-Exchange-Agentic-AI-Track-Summer-2026.git
cd IDX-Exchange-Agentic-AI-Track-Summer-2026

cp openclaw/config/openclaw.json.example ~/.openclaw/openclaw.json
# Edit ~/.openclaw/openclaw.json:
#   - set "workspace" to the full path of openclaw/workspace/
#   - add your API keys and tokens
openclaw onboard
```

### Kept Local (not in git)

- `.env` — MySQL credentials and API keys
- `openclaw/workspace/skills/property-search/.sessions.json` — chat session store
- `openclaw/workspace/skills/semantic-search/.embeddings/` — embedding cache
- `openclaw/workspace/skills/rag/.index/` — RAG chunk index
- `~/.openclaw/credentials/` — WhatsApp and channel auth
- `~/.openclaw/openclaw.json` — live config with secrets
- `~/.openclaw/agents/*/sessions/` — conversation history

---

## License

Course project — IDX Exchange Agentic AI Track, Summer 2026.
