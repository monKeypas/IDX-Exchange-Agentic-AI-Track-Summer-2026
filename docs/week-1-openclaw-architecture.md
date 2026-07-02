# Week 1 Deliverable — OpenClaw Architecture Fundamentals

**IDX Exchange · Agentic AI Track · Summer 2026**

---

## Overview

OpenClaw is a multi-agent orchestration runtime that handles skill routing, session state, channel integration, and tool execution. Understanding how these pieces interact is the foundation for every subsequent week of this track.

In our IDX Exchange use case, a real estate agent or buyer sends a natural-language query over WhatsApp (e.g., *"Show me 3-bed homes under $800k in San Jose"*). OpenClaw receives the message, routes it to the right skill, executes tools against MLS databases, updates memory, and returns a structured response — all within a single conversational turn.

---

## Architecture Flow

### High-Level Request Lifecycle

```mermaid
flowchart LR
    subgraph User Layer
        U[👤 User]
    end

    subgraph Channel Layer
        WA[📱 WhatsApp Channel]
    end

    subgraph OpenClaw Runtime
        GW[Gateway]
        ORCH[Orchestrator]
        SS[Skill Selector]
        SESS[Session Manager]
    end

    subgraph Skills
        PS[Property Search]
        MS[Market Stats]
        RAG[RAG / Knowledge]
    end

    subgraph Execution
        TE[Tool Execution]
        MEM[(Memory)]
    end

    subgraph Data Layer
        MLS[(MLS Databases)]
        VEC[(Vector Store)]
    end

    U -->|natural-language query| WA
    WA -->|inbound message| GW
    GW --> ORCH
    ORCH --> SESS
    SESS -->|session context| SS
    SS -->|route by intent| PS
    SS -->|route by intent| MS
    SS -->|route by intent| RAG
    PS --> TE
    MS --> TE
    RAG --> TE
    TE -->|SQL / API calls| MLS
    TE -->|embeddings lookup| VEC
    TE -->|write state| MEM
    MEM -->|updated context| ORCH
    ORCH -->|formatted reply| GW
    GW -->|outbound message| WA
    WA -->|response| U
```

### End-to-End Sequence

```mermaid
sequenceDiagram
    actor User
    participant WhatsApp as WhatsApp Channel
    participant Gateway as OpenClaw Gateway
    participant Orchestrator as Orchestrator
    participant Session as Session / Memory
    participant Skills as Skill Selector
    participant Tools as Tool Execution
    participant MLS as MLS Databases

    User->>WhatsApp: "Find 3BR homes under $800k in San Jose"
    WhatsApp->>Gateway: inbound message event
    Gateway->>Orchestrator: dispatch query
    Orchestrator->>Session: load user session + history
    Session-->>Orchestrator: prior context, preferences
    Orchestrator->>Skills: classify intent → property search
    Skills->>Tools: invoke searchListings(params)
    Tools->>MLS: query listings (beds, price, city)
    MLS-->>Tools: matching records
    Tools->>Session: update short-term state + log results
    Tools-->>Orchestrator: structured tool output
    Orchestrator-->>Gateway: formatted natural-language response
    Gateway-->>WhatsApp: send reply
    WhatsApp-->>User: "Here are 4 matching listings…"
```

### Simplified Linear Flow

```
User → WhatsApp → OpenClaw Runtime → Skill Selector → Tool Execution → Memory Update → Response → User
                                              ↓
                                        MLS Databases
```

---

## Key Components

| Component | Role | IDX Exchange Example |
|-----------|------|----------------------|
| **Skills** | Modular capability units the orchestrator can invoke | Property search, market stats, RAG over listing docs |
| **Channels** | Communication interfaces between users and the runtime | WhatsApp (primary), email, web UI |
| **Sessions** | Per-user conversation state and short-term memory | Buyer preferences, last search filters, follow-up context |
| **Tools** | Typed async functions the agent can call | `searchListings()`, `getMarketStats()`, `getCurrentTime()` |
| **Memory** | Short-term session state + long-term vector storage | Session history in OpenClaw; embeddings in vector DB for RAG |
| **Orchestrator** | Routes queries to the correct skill/agent | Intent classification → property search vs. market stats vs. general Q&A |

---

## Component Interaction Detail

```mermaid
flowchart TB
    subgraph Channels
        direction LR
        C1[WhatsApp]
        C2[Email]
        C3[Web]
    end

    subgraph "OpenClaw Runtime"
        direction TB
        G[Gateway<br/><i>auth, routing, port 18789</i>]
        O[Orchestrator<br/><i>multi-agent routing</i>]
        S[Skill Selector<br/><i>intent → skill mapping</i>]
        T[Tool Runner<br/><i>typed async execution</i>]
        M[Memory Layer]
    end

    subgraph "Skills (modular)"
        direction LR
        SK1[🏠 Property Search]
        SK2[📊 Market Stats]
        SK3[🔍 RAG]
    end

    subgraph "Data Sources"
        direction LR
        D1[(MLS Listings DB)]
        D2[(MLS Market Data)]
        D3[(Vector Store)]
    end

    C1 & C2 & C3 --> G
    G <--> O
    O <--> S
    S --> SK1 & SK2 & SK3
    SK1 & SK2 & SK3 --> T
    T --> D1 & D2 & D3
    T <--> M
    O <--> M
```

---

## Basic Tool Definition

Tools are plain async functions registered with the runtime. The orchestrator calls them when a skill needs external data or side effects.

```typescript
export async function getCurrentTime() {
  return { currentTime: new Date().toISOString() };
}

export async function searchListings(params: {
  city: string;
  minBeds: number;
  maxPrice: number;
}) {
  // Tool execution layer — queries MLS database
  const results = await mlsClient.query({
    city: params.city,
    bedrooms: { gte: params.minBeds },
    price: { lte: params.maxPrice },
  });
  return { listings: results, count: results.length };
}

export async function handleMessage(message: string) {
  if (message.toLowerCase().includes("time")) {
    return await getCurrentTime();
  }

  if (message.toLowerCase().includes("home") || message.toLowerCase().includes("listing")) {
    return await searchListings({
      city: "San Jose",
      minBeds: 3,
      maxPrice: 800_000,
    });
  }

  return { response: "I could not understand the request." };
}
```

---

## WhatsApp → MLS Data Path (IDX Exchange)

This diagram shows the specific path required for the Week 1 deliverable: how a user query on WhatsApp reaches MLS-backed skills.

```mermaid
flowchart TD
    A[👤 User sends WhatsApp message] --> B[WhatsApp Plugin / Channel Adapter]
    B --> C[OpenClaw Gateway<br/>local runtime · ws://127.0.0.1:18789]
    C --> D[Agent Orchestrator<br/>model: gemini-2.5-flash]
    D --> E{Skill Selector<br/>intent classification}

    E -->|property query| F[🏠 Property Search Skill]
    E -->|market question| G[📊 Market Stats Skill]
    E -->|document Q&A| H[🔍 RAG Skill]

    F --> I[Tool: searchListings]
    G --> J[Tool: getMarketStats]
    H --> K[Tool: queryKnowledgeBase]

    I --> L[(MLS Listings Database)]
    J --> M[(MLS Market Data API)]
    K --> N[(Vector Store / Embeddings)]

    I & J & K --> O[Memory Update<br/>session state + result cache]
    O --> P[Response Formatter]
    P --> Q[Gateway → WhatsApp outbound]
    Q --> R[👤 User receives reply]

    style A fill:#e8f4fd
    style R fill:#e8f4fd
    style L fill:#fff3cd
    style M fill:#fff3cd
    style N fill:#fff3cd
```

---

## Design Principles

1. **Separation of concerns** — Channels handle transport; skills handle domain logic; tools handle data access.
2. **Session-scoped memory** — Each user maintains isolated conversation state (`dmScope: per-channel-peer`).
3. **Skill modularity** — New capabilities (e.g., mortgage calculator, showing scheduler) plug in without changing the orchestrator.
4. **Typed tool contracts** — Tools return structured JSON so the model can reason over results reliably.
5. **Fail-safe routing** — Unrecognized intents fall back to a default response rather than executing the wrong skill.

---

## Local Setup Reference

This repository contains the OpenClaw agent workspace used in the architecture above:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent behavior and routing rules |
| `config/openclaw.json.example` | Gateway, WhatsApp channel, and model config template |
| `IDENTITY.md` / `SOUL.md` | Agent persona and boundaries |

See the [repository README](../README.md) for clone and restore instructions.

---

## Summary

OpenClaw acts as the orchestration layer between conversational channels (WhatsApp) and backend data systems (MLS databases). The runtime receives a user message, loads session context, routes to the appropriate skill, executes typed tools against MLS APIs, persists updated memory, and returns a natural-language response — completing the full loop from user query to data-backed answer.
