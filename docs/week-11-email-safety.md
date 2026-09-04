# Week 11 Deliverable — Email Agents & Safety Guardrails

**IDX Exchange · Agentic AI Track · Summer 2026**

## Overview

Email workflows for listing alerts, weekly market reports, property summaries, and recommendation digests — with a strict **draft → preview → human `--approve` → send** gate so nothing goes out autonomously.

## Deliverable

| Requirement | Implementation |
| --- | --- |
| Draft-then-approve email agent | `draftEmail` + `sendApprovedEmail` |
| Weekly market report from `california_sold` | `weeklyMarketReportHtml` + `draftWeeklyMarketReport` |
| Listing / summary / recommendation emails | `emailAgent.ts` use cases |
| Safety guardrail tests | `tests/guardrails.test.ts` |
| ≤50 rows per query | `clampRows` + MLS `MAX_LIMIT = 50` |

## Safety rules

| NEVER | ALWAYS |
| --- | --- |
| Send without explicit approval | Queue draft, show preview, require `--approve` |
| Log credentials | Secrets in `.env`; `redactSecrets` on logs |
| Bulk-download MLS | Cap at 50 rows |
| Autonomous outbound actions | Human confirmation on every send |

## Architecture

```text
email:draft → draftEmail() → status: pending_approval → .drafts/queue.json
     ↓
email:preview → show To / Subject / body excerpt
     ↓
email:send --approve → markApproved → sendApprovedEmail (nodemailer / Gmail)
```

Without `--approve`, send throws and exits.

## How to run

```bash
npm install
npm test

npm run email:draft -- --type market --to you@example.com --city Pasadena
npm run email:preview -- --list
npm run email:send -- --id <draftId> --approve   # needs EMAIL_USER + EMAIL_PASSWORD
```

## Key files

| File | Role |
| --- | --- |
| `src/draftEmail.ts` | Handbook STEP 1 — draft only |
| `src/sendEmail.ts` | Handbook STEP 2 — send after approval |
| `src/guardrails.ts` | Row cap, redaction, assertSendAllowed |
| `src/templates.ts` | HTML templates including weekly market report |
| `src/emailAgent.ts` | Four use-case drafters |
| `tests/guardrails.test.ts` | Safety suite |

## Continuity

Week 9’s thin `emailDraftAgent` formats chat-style drafts. Week 11 is the real email skill: queued drafts, Gmail send behind `--approve`, and market-report HTML from Week 5 `california_sold` analytics.
