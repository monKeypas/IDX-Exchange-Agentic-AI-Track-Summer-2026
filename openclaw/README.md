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
        └── property-search/     # Week 2–4 property search skill
            ├── SKILL.md
            ├── src/
            │   ├── parsePropertyQuery.ts
            │   ├── propertyFilters.ts
            │   ├── mysql.ts
            │   ├── mlsSearch.ts
            │   ├── config.ts            # INCLUDE_SOLD_COMPS toggle
            │   ├── loadEnv.ts           # project-root .env loader
            │   ├── session.ts           # multi-turn session memory
            │   └── conversation.ts      # follow-ups + WhatsApp replies
            ├── scripts/
            │   ├── parse-query.ts
            │   ├── search-mls.ts
            │   └── chat-turn.ts
            └── tests/
```

## Setup

```bash
# Point OpenClaw at THIS project's workspace (required for WhatsApp skill)
cp openclaw/config/openclaw.json.example ~/.openclaw/openclaw.json
# Edit ~/.openclaw/openclaw.json — set workspace to the full path of openclaw/workspace/
openclaw onboard
```

## Property Search Skill

From the **git project root**:

```bash
# Week 2 — parse only
npm run parse -- "3 bedroom condo in Irvine under 1.5m"

# Week 3 — one-shot MLS JSON (sold comps via INCLUDE_SOLD_COMPS)
npm run search:mls -- "3 bedroom condo in Irvine under 1.5m"

# Week 4 — multi-turn chat (use WhatsApp peer id as --user)
npm run chat -- --user alice "Find homes in Irvine"
npm run chat -- --user alice "Under $1.2M"
npm run chat -- --user alice "Single family with at least 3 beds"
```

Week 4 chat scripts load `.env` from the project root automatically.

Full Week 4 write-up: [docs/week-4-conversational-property-search.md](../docs/week-4-conversational-property-search.md).
