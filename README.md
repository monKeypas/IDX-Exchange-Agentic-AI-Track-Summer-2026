# IDX Exchange — Agentic AI Track · Summer 2026

OpenClaw-powered multi-agent system for IDX Exchange, integrating WhatsApp messaging with MLS database skills.

**Team:** monKeypas

---

## Week 1 Deliverable

📄 **[OpenClaw Architecture Fundamentals](docs/week-1-openclaw-architecture.md)**

Architecture documentation with workflow diagrams showing how user queries flow from WhatsApp through OpenClaw skills to MLS databases.

---

## Week 2 Deliverable

📄 **Natural Language Property Search** — `openclaw/workspace/skills/property-search/`

OpenClaw skill that parses free-text real estate queries into structured filter objects for `rets_property`.

```bash
npm install
npm test
npm run parse -- "Show me 3-bedroom condos in Irvine under $1.5M with a pool."
```

---

## Week 3 Deliverable

📄 **MLS Database Integration** — `openclaw/workspace/skills/property-search/`

Connects Week 2 NLP filters to MySQL tables (`rets_property`, `california_sold`) with parameterized queries, pagination, and formatted property cards.

**Prerequisites:** MySQL running with `idx_exchange` database imported (Week 0). Create a `.env` file in the project root:

```
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=idx_exchange
```

```bash
npm install
npm test                                    # optional sanity check
set -a; source .env; set +a
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"
```

Returns JSON with parsed filters, pagination, and property cards. Sold comps are controlled by `INCLUDE_SOLD_COMPS` in `src/config.ts` (default: off).

---

## Week 4 Deliverable

📄 **[Conversational Property Search](docs/week-4-conversational-property-search.md)** — `openclaw/workspace/skills/property-search/`

Multi-turn search with session memory. Asks only for missing fields, accepts several preferences in one message, then queries `rets_property` and returns WhatsApp-friendly listings (**address, price, beds/baths, photo count**).

**Ready to search when session has:** location (city or zip) + budget + at least one preference (type, beds, amenities, keywords, …).

```bash
npm install
npm test

# Simulate a WhatsApp peer conversation (same userId each turn)
npm run chat -- --user alice "Find homes in Irvine"
npm run chat -- --user alice "Under $1.2M"
npm run chat -- --user alice "Single family with at least 3 beds"

# Reset that user's session
npm run chat -- --user alice "new search"
```

For live WhatsApp: point OpenClaw workspace at this repo’s `openclaw/workspace/`, then on each inbound property message run `npm run chat -- --user "<peerId>" "<message>"` from the project root and send stdout back.

---

## Repository Structure

```
├── docs/                              # Course deliverables
│   ├── week-1-openclaw-architecture.md
│   └── week-4-conversational-property-search.md
├── openclaw/                          # All OpenClaw files
│   ├── README.md
│   ├── config/
│   │   └── openclaw.json.example
│   └── workspace/
│       ├── AGENTS.md, SOUL.md, ...    # Agent workspace files
│       └── skills/
│           └── property-search/       # Week 2–4 property search skill
│               ├── src/
│               │   ├── parsePropertyQuery.ts   # Week 2 NLP parser
│               │   ├── propertyFilters.ts      # Shared filters + SQL
│               │   ├── mysql.ts / mlsSearch.ts # Week 3 MLS layer
│               │   ├── config.ts               # sold-comps toggle
│               │   ├── session.ts              # Week 4 session memory
│               │   └── conversation.ts         # Week 4 multi-turn
│               ├── scripts/
│               │   ├── parse-query.ts
│               │   ├── search-mls.ts
│               │   └── chat-turn.ts
│               └── tests/
├── package.json
└── README.md
```

See [openclaw/README.md](openclaw/README.md) for setup details.

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
- `openclaw/workspace/skills/property-search/.sessions.json` — local chat session store
- `~/.openclaw/credentials/` — WhatsApp and channel auth
- `~/.openclaw/openclaw.json` — live config with secrets
- `~/.openclaw/agents/*/sessions/` — conversation history

---

## License

Course project — IDX Exchange Agentic AI Track, Summer 2026.
