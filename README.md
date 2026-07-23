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

## Repository Structure

```
├── docs/                              # One write-up per week
│   ├── week-1-openclaw-architecture.md
│   ├── week-2-natural-language-property-search.md
│   ├── week-3-mls-database-integration.md
│   ├── week-4-conversational-property-search.md
│   └── week-5-market-statistics-agent.md
├── openclaw/
│   ├── config/openclaw.json.example
│   └── workspace/
│       ├── AGENTS.md, SOUL.md, ...    # Agent guidance (Gemini)
│       └── skills/
│           ├── property-search/       # Weeks 2–4
│           │   ├── src/
│           │   │   ├── parsePropertyQuery.ts
│           │   │   ├── mysql.ts / mlsSearch.ts
│           │   │   └── session.ts
│           │   ├── scripts/
│           │   └── tests/
│           └── market-stats/          # Week 5
│               ├── src/
│               │   ├── parseMarketQuery.ts
│               │   ├── mysql.ts / marketStats.ts
│               ├── scripts/
│               └── tests/
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
- `~/.openclaw/credentials/` — WhatsApp and channel auth
- `~/.openclaw/openclaw.json` — live config with secrets
- `~/.openclaw/agents/*/sessions/` — conversation history

---

## License

Course project — IDX Exchange Agentic AI Track, Summer 2026.
