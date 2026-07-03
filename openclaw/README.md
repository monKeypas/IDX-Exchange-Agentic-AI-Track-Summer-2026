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
        └── property-search/     # Week 2 NLP property search skill
            ├── SKILL.md
            ├── src/
            ├── scripts/
            └── tests/
```

## Setup

```bash
# Point OpenClaw at this workspace
cp openclaw/config/openclaw.json.example ~/.openclaw/openclaw.json
# Edit ~/.openclaw/openclaw.json — set workspace to the full path of openclaw/workspace/
openclaw onboard
```
