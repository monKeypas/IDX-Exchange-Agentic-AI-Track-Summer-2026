# OpenClaw — Alice's Agent Workspace

Personal OpenClaw agent workspace and configuration templates.

## What's here

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Agent behavior and routing rules |
| `SOUL.md` | Personality and boundaries |
| `IDENTITY.md` | Agent name, vibe, avatar |
| `USER.md` | Context about the human |
| `TOOLS.md` | Environment-specific tool notes |
| `HEARTBEAT.md` | Periodic check-in prompts |
| `config/openclaw.json.example` | Sanitized config template (copy to `~/.openclaw/openclaw.json`) |

## What's NOT here (kept local)

These live under `~/.openclaw/` and are intentionally excluded from git:

- `credentials/` — WhatsApp and other channel auth
- `agents/*/sessions/` — conversation history
- `openclaw.json` — live config with API keys and tokens
- `logs/`, `cache/`, `tmp/`

## Restore on a new machine

```bash
git clone <this-repo> ~/.openclaw/workspace
cp ~/.openclaw/workspace/config/openclaw.json.example ~/.openclaw/openclaw.json
# Edit openclaw.json with your secrets, then:
openclaw onboard   # or openclaw gateway start
```
