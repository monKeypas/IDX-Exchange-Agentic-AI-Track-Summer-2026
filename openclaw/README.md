# OpenClaw

All OpenClaw-related files for this project. Week write-ups live in [`docs/`](../docs/).

```
openclaw/
├── config/
│   └── openclaw.json.example
└── workspace/
    ├── AGENTS.md, SOUL.md, IDENTITY.md, USER.md, TOOLS.md, HEARTBEAT.md
    └── skills/
        └── property-search/     # Weeks 2–4
            ├── SKILL.md
            ├── src/
            │   ├── parsePropertyQuery.ts   # Week 2
            │   ├── mysql.ts / mlsSearch.ts # Week 3
            │   └── session.ts              # Week 4
            ├── scripts/
            └── tests/
```

## Setup

```bash
cp openclaw/config/openclaw.json.example ~/.openclaw/openclaw.json
# Set workspace to the full path of openclaw/workspace/
openclaw onboard
```

## Quick commands (from git project root)

```bash
npm run parse -- "3 bedroom condo in Irvine under 1.5m"          # Week 2
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"     # Week 3
npm run chat -- --user alice "Find homes in Irvine"              # Week 4
```

| Week | Doc |
| --- | --- |
| 1 | [Architecture](../docs/week-1-openclaw-architecture.md) |
| 2 | [Natural language search](../docs/week-2-natural-language-property-search.md) |
| 3 | [MLS integration](../docs/week-3-mls-database-integration.md) |
| 4 | [Conversational search](../docs/week-4-conversational-property-search.md) |
