# Capstone Playbook

**IDX Exchange · Agentic AI Track · Summer 2026 · Team monKeypas**

Material for the written reflection, a segment plan for the backup video, and a
minute-by-minute script for the five-minute live demo.

Pre-flight steps (index builds, warming the embedding model, clearing the session store)
live in [capstone-demo-runbook.md](capstone-demo-runbook.md).

---

## Deliverable 6 — Reflection material

Raw material, not prose. Each bullet is a concrete thing that happened plus the point it
supports. Pick the five or six that feel truest and write them in your own voice.

### What worked

- **One skill per week, each independently runnable.** Every deliverable had its own
  `SKILL.md`, npm script, and tests. Nothing was blocked waiting on anything else, and any
  week could be demoed alone.

- **Tests target pure functions, so they run anywhere.** Query *builders* return
  `{sql, params}`; formatters and the classifier take strings. 105 tests, no database, no
  mocks, no network — the suite runs on a laptop with no credentials.

- **Guardrails that fail closed.** `assertSendAllowed` throws unless approval is explicit.
  When SMTP was unconfigured it refused to send rather than erroring halfway — the draft
  stayed queued and approved.

- **Local embeddings by default.** MiniLM on-device meant no API quota, no key required,
  and reproducible results. Gemini stayed available behind one env var.

- **The embedding cache knows what built it.** Stamped with model and dimensions, so
  switching providers fails fast with a clear message instead of silently comparing 384-d
  vectors to 768-d ones.

- **Range-shaped filters made multi-turn possible.** `bedsMin`/`bedsMax` and
  `minPrice`/`maxPrice` let a follow-up merge over a previous turn. Scalar fields would
  have forced a restart every message.

- **One parameterized query path.** Every table read goes through `query(sql, params)`
  with `?` placeholders. No user input is ever interpolated into SQL.

### What I'd change

- **The orchestrator arrived too late.** Built at Week 9, after six skills already
  existed. Three required features turned out to be unreachable through it — semantic
  search was never registered as an agent at all. The skill worked perfectly and no user
  could get to it.

- **A regex quietly gated working code.** `\bbedroom\b` doesn't match "bedrooms". The
  parser handled plurals fine; the classifier in front of it didn't, so "3 bedrooms" hit
  the fallback message. Invisible until the routing was tested directly.

- **Two implementations of the same feature drifted.** The CLI email agent persisted
  drafts with ids and an approval gate. The WhatsApp one was a string formatter that
  appended "Draft only". Same feature name, no shared code, only one of them complete.

- **Four byte-identical copies of `mysql.ts`.** Copy-paste was faster each week and now a
  one-line fix has to land in four places.

- **Dead code that still looks authoritative.** `toRetsFilters()` was the Week 2 database
  mapping. Week 3 replaced it with a fuller clause builder, but it stayed exported and
  still reads like the real path.

- **Typecheck wasn't in the loop.** Vitest transpiles without checking types, so five real
  type errors sat green behind a passing suite for weeks.

- **Learned the schema through bugs.** Two tables, two naming conventions — `L_City` vs
  `City`, `L_Keyword2` vs `BedroomsTotal`. An hour reading columns first would have saved
  more than an hour of debugging empty result sets.

### A throughline, if you want one

Almost everything in the second list is the same failure in different clothes: a
capability existed and worked, but nothing connected a user to it. Semantic search had no
agent. Approval had no route. The parser understood "bedrooms" but its gatekeeper didn't.

The lesson isn't "write more tests" — the skills were well tested. It's that
**integration is a feature, not glue**, and it needs to be built and tested alongside each
capability rather than assembled at the end.

---

## Deliverable 5 — Backup video (~8 minutes)

No clock pressure here, so this is where the architecture, the schema work, and the
scoring internals go — everything the live slot can't afford. Record it *after* you
rehearse the live demo, so the demo segment is already smooth.

| Time | Segment | What to say / show |
|---|---|---|
| 0:00 | **What it is** | One sentence: a WhatsApp assistant that answers real-estate questions by routing across seven agents and two MLS databases. Name the ten features once, quickly — don't demo them yet. *On screen: README* |
| 0:30 | **Architecture** | Walk the flow diagram top to bottom: message arrives, `classifyIntent` picks an intent, one or two agents run, each agent owns a skill, skills hit the tables. Point out that a mixed query fans out to two agents in parallel and touches both databases on one turn. *On screen: docs/architecture.md* |
| 2:00 | **The two databases** | Your strongest technical segment, and the one nobody else will have. The tables don't share a naming convention: `L_City` vs `City`, `L_Keyword2` for bedrooms, `LM_Dec_3` for bathrooms. The `*YN` amenity flags are strings — `'True'`, `'1'`, `'Yes'` — so a naive `= true` silently drops most matches. Show `ynClause()` handling all three spellings. *On screen: docs/schema-annotation.md, then mlsSearch.ts* |
| 3:30 | **The full chain, uncut** | Run the same eight messages from the live script, start to finish, without narrating over the top. This is the segment that saves you if the live demo goes wrong, so let it play clean. *On screen: WhatsApp* |
| 6:00 | **Under the hood** | Two things worth opening: the hybrid recommendation score (structured similarity plus 40 points of cosine, validated against sold comps within ±20% square footage), and the routing precedence — why approval is checked before drafting, and why structured filters beat descriptive search. *On screen: hybridScore.ts, classifyIntent.ts* |
| 7:00 | **The safety gate** | Show `assertSendAllowed` and say plainly what it guarantees: there is no code path that sends an email without explicit human approval — not from a draft turn, not from a heartbeat. Mention the 50-row cap and credential redaction while you're in the file. *On screen: guardrails.ts* |
| 7:45 | **What I'd change** | Thirty seconds, one point. The orchestrator arrived at Week 9 and three working features turned out to be unreachable through it. Integration is a feature. End there. |

---

## Deliverable 4 — Live demo script (5 minutes)

Eight messages, each doing more than one job. Times are cumulative and leave about twenty
seconds of slack. Every intent below is pinned by a test, so the routing is the part least
likely to surprise you.

**0:00 — Opening, about 60 seconds.** What the system is and what it queries
(`rets_property` for active listings, `california_sold` for closed sales); one entry
point, a classifier, seven agents across eight routes; then the method behind each —
English compiled to parameterized SQL, 384-dimension embeddings ranked by cosine
similarity, hybrid scoring at roughly 60/40, retrieval for knowledge questions. Close on
the hook: "the last one is the one it won't send by itself." Architecture diagram on
screen, not narrated. Full wording is in `how-it-works.html`.

---

**0:45 · `Find me affordable homes in Pasadena and tell me whether prices are rising`**

- **Shows:** orchestration, parallel agents, property search *and* market analytics, both
  tables — in one message.
- **Say:** "That's one message hitting two agents in parallel — active listings from one
  table, closed sales from another — and merging the reply."

**1:30 · `Under $1.2M`**

- **Shows:** session memory — the city carries over with no restating.
- **Say:** "I never said Pasadena again."

**1:50 · `Only 3 bedrooms`**

- **Shows:** filters stacking across turns rather than replacing each other.
- **Say:** keep this short — it's proof, not a feature tour. *If you're running behind,
  this is the one to drop — message 2 already proved memory works.*

**2:05 · `charming craftsman with mountain views`**

- **Shows:** semantic search over `L_Remarks` embeddings.
- **Say:** "No filters in that sentence — nothing to put in a WHERE clause. This is cosine
  similarity over the agent remarks."

**2:40 · `I like the first one, find similar homes`**

- **Shows:** recommendations plus comp validation against closed sales.
- **Say:** "Structured similarity and embedding similarity combined, then priced against
  comps within twenty percent of its square footage."

**3:15 · `What does DOM mean?`**

- **Shows:** RAG grounded in indexed documents, with sources.
- **Say:** "Retrieved from indexed docs, not generated from memory — note the sources line."

**3:40 · `Draft an email about Pasadena listings`** ← the gate

- **Shows:** drafting — returns a preview and a draft id, and sends nothing.
- **Say:** "Nothing has been sent. It's queued as pending approval, and there is no code
  path that sends it without me saying so." **Then pause.** The silence is the deliverable.

**4:15 · `approve`** ← the gate closing

- **Shows:** the send happens only now.
- **Say:** "That's the human in the loop. One word, and only now does it send."

---

**4:40 — Close on the throughline, not a feature list.** "Eight messages, seven agents,
both databases, and one thing that deliberately refused to happen on its own."

### If it goes wrong

- **"I'm not sure how to help with that"** — the classifier returned `unknown`. Rephrase
  with a concrete noun rather than repeating yourself.
- **A semantic or recommendation query hangs** — cold model or unbuilt cache. Move to the
  RAG question and come back.
- **Approval says sending failed** — mail credentials aren't set. Say so and move on: the
  guardrail refused to fail open, which is the behaviour you're demonstrating.
- **Empty results** — Pasadena and Irvine are the safest cities in this dataset.
