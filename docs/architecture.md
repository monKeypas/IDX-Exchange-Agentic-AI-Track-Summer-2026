# Capstone Architecture — IDX Multi-Agent Real Estate Assistant

**IDX Exchange · Agentic AI Track · Summer 2026 · Team monKeypas**

As-built architecture of the delivered system. (The Week 1 diagram in
[week-1-openclaw-architecture.md](week-1-openclaw-architecture.md) was the original plan;
this one reflects what actually shipped, including the agents and safety gate added in
Weeks 6–11.)

---

## Full multi-agent flow

```mermaid
flowchart TD
    U([User on WhatsApp]) <--> WA[OpenClaw WhatsApp Channel]
    WA --> HANDLER["onWhatsAppMessage()<br/>orchestrator/src/whatsapp.ts"]
    HANDLER --> ORCH["orchestrate()<br/>orchestrator/src/orchestrate.ts"]
    ORCH --> SS{"classifyIntent()"}

    SS -->|search| A1[propertySearchAgent]
    SS -->|mixed| A1
    SS -->|mixed| A2
    SS -->|market| A2[marketStatsAgent]
    SS -->|semantic| A3[semanticSearchAgent]
    SS -->|recommend| A4[recommendationAgent]
    SS -->|knowledge| A5[ragAgent]
    SS -->|email| A6[emailDraftAgent]
    SS -->|email_approve| A7[emailApprovalAgent]

    A1 --> SK1[property-search skill]
    A2 --> SK2[market-stats skill]
    A3 --> SK3[semantic-search skill]
    A4 --> SK4[recommendations skill]
    A5 --> SK5[rag skill]
    A6 --> SK6[email-agent skill]
    A7 --> SK6

    SK1 --> DB1[("rets_property<br/>active listings")]
    SK2 --> DB2[("california_sold<br/>closed sales")]
    SK2 --> DB1
    SK3 --> EMB[("embedding cache<br/>L_Remarks vectors")]
    SK3 --> DB1
    SK4 --> EMB
    SK4 --> DB1
    SK4 --> DB2
    SK5 --> IDX[("RAG chunk index<br/>knowledge/*.md")]
    SK5 --> SK2

    SK1 <--> MEM[("session store<br/>.sessions.json")]
    A4 --> MEM
    SK6 <--> QUEUE[("draft queue<br/>.drafts/queue.json")]

    A1 --> REPLY[formatForWhatsApp]
    A2 --> REPLY
    A3 --> REPLY
    A4 --> REPLY
    A5 --> REPLY
    A6 --> REPLY
    A7 --> REPLY
    REPLY --> HANDLER

    classDef db fill:#e8eef7,stroke:#4a6fa5,color:#1a2b42
    classDef cache fill:#f2eee8,stroke:#a58a4a,color:#42351a
    class DB1,DB2 db
    class EMB,IDX,MEM,QUEUE cache
```

Both databases are reachable from the single WhatsApp entry point, and a mixed-intent
query fans out to `propertySearchAgent` and `marketStatsAgent` in parallel
(`Promise.all`), hitting `rets_property` and `california_sold` on one turn.

---

## The email approval gate

The one flow that deliberately **cannot** complete in a single turn. No email is ever sent
without a human typing an approval first — not from a draft turn, not from a heartbeat,
not from any autonomous path.

```mermaid
sequenceDiagram
    participant H as Human (WhatsApp)
    participant O as Orchestrator
    participant D as emailDraftAgent
    participant Q as Draft queue
    participant A as emailApprovalAgent
    participant M as SMTP

    H->>O: "Draft an email about Pasadena listings"
    O->>D: intent = email
    D->>D: gather listings / market content
    D->>Q: saveDraft(status = pending_approval)
    D-->>H: preview + draft id + "Reply approve to send"
    Note over H,M: Nothing has been sent. Turn ends here.

    H->>O: "approve"
    O->>A: intent = email_approve
    A->>Q: find pending draft for this user
    A->>A: markApproved()
    A->>M: sendApprovedEmail(explicitApprove = true)
    Note right of A: assertSendAllowed() throws<br/>unless approval is explicit
    M-->>A: accepted
    A->>Q: status = sent
    A-->>H: "Sent <subject> to <recipient>"
```

Enforcement lives in `email-agent/src/guardrails.ts`:

- `assertSendAllowed()` throws unless `explicitApprove` is true **and** the draft is in an
  approvable state — the send path cannot be reached by accident.
- `clampRows()` caps any result set at 50 rows, so an email can never bulk-export MLS data.
- `redactSecrets()` / `safeLog()` strip credentials from every log and preview.

---

## Intent routing

| Intent | Trigger | Agent | Data |
|---|---|---|---|
| `search` | Structured filters — beds, baths, price, city, amenities | `propertySearchAgent` | `rets_property` |
| `market` | Trends, DOM, median, inventory, "good time to buy" | `marketStatsAgent` | `california_sold` (+ active counts) |
| `mixed` | Search **and** market signals in one message | both, in parallel | both tables |
| `semantic` | Descriptive prose with no structured filters | `semanticSearchAgent` | `L_Remarks` embeddings |
| `recommend` | "similar", "I like X" | `recommendationAgent` | `rets_property` + `california_sold` comps |
| `knowledge` | "what does/is", definitions, disclosures | `ragAgent` | indexed docs + live market chunk |
| `email` | "draft", "email", "send me a summary" | `emailDraftAgent` | draft queue |
| `email_approve` | "approve", "send it" | `emailApprovalAgent` | draft queue → SMTP |

Routing precedence is ordered so approval is checked before drafting (an approval acts on
an existing draft and never creates one), structured search beats descriptive search when
filters are present, and a leading "what does/is" suppresses the market match so
definitional questions reach RAG. Pinned by `orchestrator/tests/orchestrate.test.ts`.

---

## Component map

| Layer | Location |
|---|---|
| WhatsApp channel | OpenClaw plugin, configured in `openclaw/config/openclaw.json.example` |
| Message handler | `orchestrator/src/whatsapp.ts` |
| Coordinator | `orchestrator/src/orchestrate.ts`, `classifyIntent.ts`, `agents.ts` |
| Skills | `openclaw/workspace/skills/{property-search,market-stats,semantic-search,recommendations,rag,email-agent}/` |
| Data access | One pooled, parameterized `query()` per skill (`src/mysql.ts`) |
| Agent context | `openclaw/workspace/*.md` + each skill's `SKILL.md` |

Skills are reachable two ways: the OpenClaw agent reads `SKILL.md` and shells out to the
matching `npm run` script, while the orchestrator imports each skill's `src/` directly.
Field-level notes on both tables are in [schema-annotation.md](schema-annotation.md).
