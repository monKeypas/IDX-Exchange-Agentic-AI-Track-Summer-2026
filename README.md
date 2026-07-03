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

## Repository Structure

```
├── docs/                              # Course deliverables
│   └── week-1-openclaw-architecture.md
├── openclaw/                          # All OpenClaw files
│   ├── README.md
│   ├── config/
│   │   └── openclaw.json.example
│   └── workspace/
│       ├── AGENTS.md, SOUL.md, ...    # Agent workspace files
│       └── skills/
│           └── property-search/       # Week 2 skill + parser + tests
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

- `~/.openclaw/credentials/` — WhatsApp and channel auth
- `~/.openclaw/openclaw.json` — live config with secrets
- `~/.openclaw/agents/*/sessions/` — conversation history

---

## License

Course project — IDX Exchange Agentic AI Track, Summer 2026.
