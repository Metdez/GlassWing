# JamSpread — Project Map

**Glasswing Deal Research Tool** — a full-stack VC research application that takes a company URL and produces a 17-section investment brief. It chains web scraping (Firecrawl), SERP intelligence (NimbleWay), org enrichment (Apollo), and AI synthesis (Claude) via a jam-nodes workflow pipeline, exposed through a Next.js 15 frontend with a dark Bloomberg-terminal aesthetic.

---

## File Tree

```
JamSpread/
├── .gitignore                              # Excludes .env, build artifacts, Python cache
├── GEMINI.md                               # Master project spec: architecture, API refs, all 16 workflow nodes, design direction
├── PROJECT.md                              # ← this file
│
├── directives/                             # Reserved — future execution directives
├── execution/                              # Reserved — future runtime logs / output
│
├── docs/
│   └── superpowers/plans/
│       └── 2026-03-16-investment-memo.md   # Milestone plan for investment memo feature
│
└── glasswing-research/                     # Next.js 15 application (main product)
    ├── package.json                        # Deps: Next.js, jam-nodes 0.2.10, Tailwind 4, Zod, Anthropic SDK
    ├── next.config.ts                      # Next.js build config
    ├── tsconfig.json                       # TypeScript config
    ├── postcss.config.mjs                  # PostCSS / Tailwind pipeline
    ├── eslint.config.mjs                   # ESLint rules
    ├── README.md                           # Quickstart, .env.local setup, Vercel deployment guide
    ├── public/                             # Static assets (favicon, etc.)
    │
    └── src/
        ├── lib/
        │   ├── types.ts                    # All shared TypeScript interfaces — the contract layer imported by every file
        │   ├── workflow.ts                 # 11-node jam-nodes pipeline: scrape → SERP → AI agents → enrich → competitors → Perplexity team → analyze
        │   └── prompts.ts                  # Claude system prompt (VC analyst persona) + dynamic user prompt builder
        │
        ├── app/
        │   ├── layout.tsx                  # Root layout: JetBrains Mono / IBM Plex fonts, site metadata
        │   ├── page.tsx                    # Main page: 4-state machine (idle/loading/done/memo), scroll sync via Intersection Observer
        │   ├── globals.css                 # Dark theme CSS vars, 40px grid background, chat button pulse animation
        │   └── api/
        │       ├── research/route.ts       # POST /api/research — validates URL, runs workflow, returns ResearchBrief
        │       ├── memo/route.ts           # POST /api/memo — generates 9-section investment memo via Claude
        │       └── chat/route.ts           # POST /api/chat — multi-turn Q&A with full brief as context
        │
        └── components/
            ├── SearchForm.tsx              # URL input + example chips (stripe.com, openai.com, scale.ai)
            ├── LoadingState.tsx            # Animated 5-step progress timeline with staggered delays (0s–40s)
            ├── ResearchBrief.tsx           # Main brief renderer: 17 section cards, competitor table, funding timeline, headcount bars
            ├── BriefSection.tsx            # Reusable card: title, icon, content, variant border color (default/warning/positive)
            ├── BriefSidebar.tsx            # Left nav: 4 grouped sections (Core/Data/Network/Intel), active highlight, Generate Memo CTA
            ├── BriefChat.tsx               # Sliding right panel: starter question chips, chat history, calls /api/chat
            └── InvestmentMemo.tsx          # Memo renderer: section header parser, bullet/paragraph layout, copy-to-clipboard
```

---

## Key Files by Responsibility

| Responsibility | File |
|---|---|
| Type contract (imported everywhere) | `src/lib/types.ts` |
| Workflow orchestration (10 nodes) | `src/lib/workflow.ts` |
| Claude prompts & schema | `src/lib/prompts.ts` |
| Research API route | `src/app/api/research/route.ts` |
| Memo generation route | `src/app/api/memo/route.ts` |
| Chat Q&A route | `src/app/api/chat/route.ts` |
| App state machine (4 views) | `src/app/page.tsx` |
| Brief display (17 sections) | `src/components/ResearchBrief.tsx` |
| Sidebar navigation | `src/components/BriefSidebar.tsx` |
| Chat panel | `src/components/BriefChat.tsx` |
| Investment memo view | `src/components/InvestmentMemo.tsx` |

---

## Data Flow

```
User enters URL
      ↓
SearchForm → POST /api/research
      ↓
workflow.ts (jam-nodes pipeline)
  Node 1  → Firecrawl scrape (website markdown)
  Node 2  → NimbleWay Google SERP
  Node 3  → NimbleWay ChatGPT + Perplexity agents (parallel)
  Node 4  → Apollo org enrichment
  Node 5  → Apollo news articles
  Node 6  → Apollo job postings
  Node 7  → Apollo people search (leadership + alumni, parallel)
  Node 8  → NimbleWay news search
  Node 9  → Competitor discovery (NimbleWay → Claude domain extract → Apollo ×3)
  Node 9.5→ NimbleWay moat/competitive intelligence search (parallel)
  Node 9.75→ Perplexity Sonar — founding team deep research (live web, cited)
  Node 10 → Anthropic Claude → 18-section ResearchBrief JSON (incl. founderDeepDive)
      ↓
page.tsx renders ResearchBrief + BriefSidebar
      ↓
User can:  Generate Memo → /api/memo → InvestmentMemo view
           Ask questions  → /api/chat → BriefChat panel
```

---

## Environment Variables

| Variable | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | Node 10 (analysis), /api/memo, /api/chat |
| `FIRECRAWL_API_KEY` | Node 1 (scrape) |
| `APOLLO_API_KEY` | Nodes 4–7, 9 (org enrichment, people, competitors) |
| `NIMBLE_API_KEY` | Nodes 2, 3, 8, 9, 9.5 (SERP, news, moat search) |
| `PERPLEXITY_API_KEY` | Node 9.75 (founding team deep research via Sonar API) |

All NimbleWay and Apollo calls are optional — the workflow degrades gracefully if keys are absent.
