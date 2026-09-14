# Capstone Demo Runbook

**5-minute live demo via WhatsApp + screen share.**

---

## Pre-flight (do this before you present)

```bash
npm install
cp .env.example .env          # set MYSQL_*, and EMAIL_USER/EMAIL_PASSWORD for the send step
npx tsc --noEmit && npm test  # expect: tsc clean, 105 tests passing

npm run rag:index             # required — RAG answers fail without it
npm run embed:build           # required — semantic search + recommendations fail without it
```

**Warm the embedding model.** The first MiniLM load takes ~25 seconds; every load after is
~200ms. Run one throwaway semantic query before you go live or your first demo message
will hang on screen share:

```bash
npm run search:semantic -- "warm up the model"
```

**Use a fresh session id.** `.sessions.json` persists filters between runs, so a rehearsal
leaves state that will pollute the live demo. Either pick an unused `--user` for the real
run, or clear the store:

```bash
rm -f openclaw/workspace/skills/property-search/.sessions.json
```

---

## The chain (~4 minutes, leaves buffer)

Each message is chosen to demonstrate more than one feature at once. Every intent below is
pinned by tests in `orchestrator/tests/orchestrate.test.ts`.

| # | Send this | Shows |
|---|---|---|
| 1 | *"Find me affordable homes in Pasadena and tell me whether prices are rising"* | Orchestration, parallel agents, property search **and** market analytics, both tables — in one message |
| 2 | *"Under $1.2M"* | Multi-turn session memory — the city carries over |
| 3 | *"Only 3 bedrooms"* | Progressive refinement stacking on the prior turn |
| 4 | *"fully renovated with a chef's kitchen and open floor plan"* | Semantic similarity over `L_Remarks` embeddings |
| 5 | *"I like the first one, find similar homes"* | Recommendation engine + comp validation from `california_sold` |
| 6 | *"What does DOM mean?"* | RAG grounded in indexed docs |
| 7 | *"Draft an email to me@example.com about Pasadena listings"* | Email drafting — returns a preview and a draft id, **sends nothing** |
| 8 | *"approve"* | The approval gate closing the loop — send happens only now |

Say out loud on step 7 that nothing has been sent yet. That pause is the deliverable.

---

## If something fails live

- **"I'm not sure how to help with that"** — the classifier returned `unknown`. Rephrase
  with a concrete noun ("3 bedroom homes in Pasadena") rather than repeating the message.
- **Semantic or recommendation query hangs** — the embedding cache was not built, or the
  model is cold. Move to the RAG question and come back.
- **Approval says sending failed** — `EMAIL_USER` / `EMAIL_PASSWORD` are unset. The draft
  stays queued and approved. Point out that the guardrail behaved correctly: it refused to
  send rather than failing open.
- **Empty results** — check the city actually has active rows; Pasadena and Irvine are the
  safest bets in this dataset.

---

## Save for the backup video

Architecture diagrams, hybrid scoring internals, schema annotations, the test suite, and
the `assertSendAllowed` code path. None of it survives a 5-minute live slot.
