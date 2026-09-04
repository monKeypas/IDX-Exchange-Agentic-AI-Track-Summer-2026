---
name: email-agent
description: "Draft-then-approve email workflows for listing alerts, weekly market reports, property summaries, and recommendation digests. NEVER sends without explicit --approve. Use when the user wants an email draft or market report email."
---

# Email Agent (Week 11)

Automated email **drafts** with a hard approval gate. No email is sent unless a human runs `email:send` with `--approve`.

## Safety (non-negotiable)

| NEVER | ALWAYS |
|-------|--------|
| Send without explicit approval | Queue as draft, show preview, require `--approve` |
| Log API keys / passwords | Secrets in `.env` only; logs are redacted |
| Bulk-export MLS data | ≤50 rows per query |
| Autonomous outbound sends | Every send requires human confirmation |

## Use cases

1. **Listing alert** — active matches from `rets_property`
2. **Weekly market report** — `california_sold` analytics template
3. **Property summary** — address, photos, price card
4. **Recommendation digest** — Week 7 similar homes

## Commands

```bash
# Draft only (queued, not sent)
npm run email:draft -- --type market --to you@example.com --city Pasadena
npm run email:draft -- --type listings --to you@example.com --query "homes in Pasadena under 900k"
npm run email:draft -- --type summary --to you@example.com --query "condo in Irvine under 1.5m"
npm run email:draft -- --type recommend --to you@example.com --query "I like 257 Fay Way, find similar"

# Preview
npm run email:preview -- --list
npm run email:preview -- --id <draftId>

# Send ONLY after human review
npm run email:send -- --id <draftId> --approve
```

Requires `.env`: `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail app password) — only needed for the send step.

## Source files

```
email-agent/
├── SKILL.md
├── src/
│   ├── draftEmail.ts      # STEP 1: draft → pending_approval
│   ├── sendEmail.ts       # STEP 2: send only with --approve
│   ├── guardrails.ts      # ≤50 rows, redact secrets, assert approval
│   ├── templates.ts       # HTML templates (market report, etc.)
│   ├── emailAgent.ts      # Use-case workflows
│   └── draftStore.ts      # Local draft queue
├── scripts/run-email.ts
└── tests/guardrails.test.ts
```
