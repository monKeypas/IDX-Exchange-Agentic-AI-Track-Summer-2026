# Week 1 Deliverable — OpenClaw Architecture Fundamentals

**IDX Exchange · Agentic AI Track · Summer 2026**

## Architecture Documentation

This document describes how user queries flow from WhatsApp through OpenClaw skills to MLS databases, then back to the user.

### Workflow Diagram (Single Source of Truth)

```mermaid
flowchart TD
    U[User] --> WA[WhatsApp Channel]
    WA --> GW[OpenClaw Gateway]
    GW --> ORCH[Orchestrator]
    ORCH --> SS{Skill Selector}

    SS -->|property query| SK1[Property Search Skill]
    SS -->|market stats query| SK2[Market Stats Skill]
    SS -->|knowledge query| SK3[RAG Skill]

    SK1 --> T1[Tool: searchListings]
    SK2 --> T2[Tool: getMarketStats]
    SK3 --> T3[Tool: queryKnowledgeBase]

    T1 --> MLS1[(MLS Listings Database)]
    T2 --> MLS2[(MLS Market Data)]
    T3 --> VDB[(Vector Store)]

    MLS1 --> T1
    MLS2 --> T2
    VDB --> T3

    T1 --> SK1
    T2 --> SK2
    T3 --> SK3

    SK1 --> MEM[(Session Memory)]
    SK2 --> MEM
    SK3 --> MEM

    SK1 --> RESP[Skill-formatted response text]
    SK2 --> RESP
    SK3 --> RESP

    RESP --> ORCH
    ORCH -->|response payload| GW
    GW --> WA
    WA --> U
```

## Key Points

- OpenClaw routes incoming WhatsApp messages using the orchestrator and skill selector.
- Skills call tools to fetch raw data from MLS data sources.
- Tool output returns to the active skill, not directly to memory or gateway.
- The active skill updates memory and formats the final user-facing text.
- The orchestrator forwards the skill response payload to gateway/channel for delivery.
