# Week 10 Deliverable — WhatsApp Communication Layer

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Wire the Week 9 orchestrator to WhatsApp as the primary conversational interface. Users search for homes, ask market questions, get recommendations, and receive formatted replies — all in real time over WhatsApp.

Most of this path already existed from Weeks 1–9 (OpenClaw WhatsApp channel + `AGENTS.md` + `npm run orchestrate`). Week 10 names that path explicitly and adds a handbook-shaped message handler.

## Architecture

```text
WhatsApp
  → OpenClaw Channel (gateway + WhatsApp plugin)
  → AGENTS.md (default: run orchestrate for any message)
  → onWhatsAppMessage(message, userId)
       → sendTypingIndicator (OpenClaw shows typing while the script runs)
       → orchestrate(message, userId)
            → [property / market / recommend / rag / email agents]
            → rets_property / california_sold / RAG index
       → formatForWhatsApp(result)
  → stdout relayed to WhatsApp
```

## Deliverable

| Requirement | Implementation |
| --- | --- |
| End-to-end WhatsApp assistant | OpenClaw WhatsApp + `AGENTS.md` + `npm run orchestrate` |
| Message handler | `orchestrator/src/whatsapp.ts` → `onWhatsAppMessage` |
| Orchestrator wiring | Calls Week 9 `orchestrate()` |
| Clean formatted responses | Agents return WhatsApp-ready text; `formatForWhatsApp` finalizes / error-wraps |
| Property search / market / recommendations | Routed via Week 9 intent classifier |

## Message handler (handbook shape)

```ts
export async function onWhatsAppMessage(message: string, userId: string) {
  await sendTypingIndicator(userId);
  try {
    const result = await orchestrate(message, userId);
    return formatForWhatsApp(result);
  } catch (err) {
    console.error("Orchestration error:", err);
    return "Sorry, I hit an issue. Please try again.";
  }
}
```

### Compared to the handbook sample

| Handbook | This repo |
| --- | --- |
| `onWhatsAppMessage` | ✅ `src/whatsapp.ts` |
| `sendTypingIndicator` | ✅ Hook present; live typing comes from OpenClaw while the agent runs the script |
| `formatForWhatsApp` on structured `listings[]` | ✅ Supported if `listings` is passed; default path uses agent `reply` strings (already WhatsApp-formatted from Weeks 4–8) |
| Direct Baileys / Meta webhook | ❌ Not needed — OpenClaw **is** the WhatsApp channel (`openclaw/config/openclaw.json.example`) |

## How to run

```bash
# Same entry point OpenClaw uses for every WhatsApp message:
npm run orchestrate -- --user "<whatsapp-peer-id>" "Find homes in Pasadena under $900k"

# Structured debug:
npm run orchestrate -- --user alice --json "What does DOM mean?"
```

On WhatsApp: send any message; OpenClaw should run the command above and relay **stdout verbatim**.

## Key files

| File | Role |
| --- | --- |
| `orchestrator/src/whatsapp.ts` | `onWhatsAppMessage`, `formatForWhatsApp`, typing hook |
| `orchestrator/src/orchestrate.ts` | Week 9 coordinator |
| `orchestrator/scripts/run-orchestrator.ts` | CLI / OpenClaw entry (text path uses Week 10 handler) |
| `openclaw/workspace/AGENTS.md` | WhatsApp default: prefer `orchestrate` |
| `openclaw/config/openclaw.json.example` | WhatsApp channel enabled |

## Continuity

Week 9 built the multi-agent router. Week 10 is the **communication layer**: WhatsApp as the UI, OpenClaw as the channel, `onWhatsAppMessage` as the explicit handler around `orchestrate()`. Week 11 adds draft-then-approve email workflows.
