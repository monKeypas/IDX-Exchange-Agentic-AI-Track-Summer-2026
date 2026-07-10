# OpenClaw

All OpenClaw-related files for this project.

```
openclaw/
├── config/
│   └── openclaw.json.example    # Config template (copy to ~/.openclaw/openclaw.json)
└── workspace/
    ├── AGENTS.md                # Agent behavior and routing rules
    ├── SOUL.md                  # Agent personality and boundaries
    ├── IDENTITY.md              # Agent identity
    ├── USER.md                  # Human context
    ├── TOOLS.md                 # Environment-specific tool notes
    ├── HEARTBEAT.md             # Periodic check-in prompts
    └── skills/
        └── property-search/     # Week 2–3 property search skill
            ├── SKILL.md
            ├── src/
            │   ├── parsePropertyQuery.ts   # Week 2 NLP parser
            │   ├── mysql.ts                # Week 3 MySQL connection
            │   └── mlsSearch.ts            # Week 3 queries + card formatting
            ├── scripts/
            │   ├── parse-query.ts          # Parse-only CLI
            │   └── search-mls.ts           # Full search CLI
            └── tests/
```

## Setup

```bash
# Point OpenClaw at this workspace
cp openclaw/config/openclaw.json.example ~/.openclaw/openclaw.json
# Edit ~/.openclaw/openclaw.json — set workspace to the full path of openclaw/workspace/
openclaw onboard
```

## Property Search Skill

From the project root:

```bash
# Week 2 — parse query into filters only
npm run parse -- "3 bedroom condo in Irvine under 1.5m"

# Week 3 — parse + query MLS + return property cards (requires .env with MySQL creds)
set -a; source .env; set +a
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"
```
