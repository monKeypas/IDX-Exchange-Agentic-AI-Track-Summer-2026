# IDX Exchange Internal Documentation

IDX Exchange internship program — how this agentic MLS assistant is organized.

## Product

IDX Exchange is building an OpenClaw-powered multi-agent system that connects WhatsApp to California MLS data. Users ask in natural language; skills query MySQL and reply with listings, stats, or explanations.

Team handle: monKeypas.

## Data

Two MySQL tables in database `idx_exchange`:

1. rets_property — active listings (about 53,000 rows). Status L_Status = Active.
2. california_sold — closed sales / comps (about 87,000 rows). Used for market analytics and price validation.

Project-root `.env` holds MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.

## Skills (weeks)

- property-search (Weeks 2–4): parse NL filters, search active listings, multi-turn chat.
- market-stats (Week 5): city market report from california_sold (median/avg price, DOM, list-to-close, trends, inventory).
- semantic-search (Week 6): vibe search using local MiniLM embeddings of listing remarks; cosine similarity top 5.
- recommendations (Week 7): hybrid similar-listings (structured 60% + embedding 40%) plus california_sold comps.
- rag (Week 8): document Q&A grounded in this knowledge folder — MLS fields, glossary, CA law summaries, market metric definitions.

## Commands (git project root)

- npm run parse — Week 2 parser
- npm run search:mls — Week 3 MLS search
- npm run chat — Week 4 conversational search
- npm run market — Week 5 market stats
- npm run embed:build / npm run search:semantic — Week 6
- npm run recommend — Week 7
- npm run rag — Week 8 document Q&A

## Routing rules

Use property-search for finding homes with beds/baths/price/city filters.
Use market-stats for “is now a good time to buy in X” or city averages.
Use semantic-search for vibe descriptions without a specific liked listing.
Use recommendations when the user likes a property and wants similar ones.
Use rag for definitions, MLS column questions, terminology, and disclosure/law summaries — not live listing search.

## Market analytics agent (Week 5)

The market-stats skill is the market analytics agent. It computes:

- sold count over N months (default 12)
- median and average close price
- average price per square foot (ClosePrice / LivingArea)
- average days on market (DOM)
- list-to-close ratio: ClosePrice / ListPrice × 100
- month-over-month price trend
- year-over-year price, DOM, and sales
- active inventory from rets_property vs sold volume (months of inventory)

When a RAG question is about what those metrics mean, answer from these definitions. When the user wants live numbers for a city, they should run npm run market instead of relying only on RAG.
