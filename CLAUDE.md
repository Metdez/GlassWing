# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered deal research tool for Glasswing Ventures. Users paste a company URL → website is scraped → Claude analyzes → structured 17-section research brief is displayed. A second feature generates a VC investment memo from the brief with one click.

## Commands

All commands run from `glasswing-research/`:

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build (TypeScript + Next.js)
npm run lint     # ESLint
```

No test suite exists. Validate manually via `npm run build` (strict TypeScript will catch type errors).

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict mode)
- **Tailwind CSS 4** with CSS custom properties for theming
- **@jam-nodes/core + @jam-nodes/nodes 0.2.10** — workflow engine that chains HTTP request nodes
- **Zod 4** — request validation at API boundaries
- **React Compiler** enabled in `next.config.ts` (no manual `useMemo`/`useCallback` needed)

## Environment Variables

Required in `glasswing-research/.env.local`:

```
ANTHROPIC_API_KEY   # Required — Claude analysis (Node 10)
FIRECRAWL_API_KEY   # Required — website scraping (Node 1)
NIMBLE_API_KEY      # Optional — Google SERP + AI platform queries (Nodes 2, 3, 8, 9, 9.5)
APOLLO_API_KEY      # Optional — org enrichment, news, jobs, people (Nodes 4–7, 9C)
```

Optional APIs degrade gracefully — their nodes fail silently. Nodes 1 (Firecrawl) and 10 (Claude) are critical and will surface errors.

## Architecture

### Workflow Engine (`src/lib/workflow.ts`)

`runResearchWorkflow(companyUrl)` orchestrates 10 sequential HTTP nodes via jam-nodes:

1. **Firecrawl** — scrape website to markdown
2. **NimbleWay SERP** — Google search results *(optional)*
3. **NimbleWay AI** — ChatGPT + Perplexity responses in parallel *(optional)*
4. **Apollo Org** — company enrichment (funding, headcount, tech stack) *(optional)*
5. **Apollo News** — recent articles *(optional, requires org ID from Node 4)*
6. **Apollo Jobs** — job postings *(optional, requires org ID)*
7. **Apollo People** — leadership + alumni in parallel *(optional)*
8. **NimbleWay News** — last-12-months news *(optional)*
9. **Competitor Discovery** — SERP → Claude extraction → Apollo enrichment for 3 competitors *(requires both NIMBLE + APOLLO)*
9.5. **NimbleWay Moat** — competitive intelligence parallel queries *(optional)*
10. **Claude** — `claude-sonnet-4-20250514` analyzes all data → structured JSON brief

`NodeRegistry` is a module-level singleton; `ExecutionContext` is per-request. Node outputs are merged into context via `ctx.storeNodeOutput(nodeId, output)` and downstream nodes reference them via `{{variableName}}` interpolation.

### API Routes

| Route | Purpose | Timeout |
|-------|---------|---------|
| `POST /api/research` | Runs full workflow, returns `ResearchBrief` | 60s |
| `POST /api/memo` | Calls Claude directly (no jam-nodes) to generate investment memo | 60s |
| `POST /api/chat` | Q&A on the research brief | — |

The memo route manually bounds the brief before sending to Claude to avoid token limits (the brief object can exceed 50KB). It uses `claude-sonnet-4-20250514` directly via the Anthropic SDK.

### Frontend State Machine (`src/app/page.tsx`)

```
idle → loading → done → memo
         ↓        ↓
         └────────┘ (error resets to idle)
```

State is managed entirely with React hooks at the page level — no state management library. `BriefSidebar` highlights the active section via `IntersectionObserver`.

### Shared Types (`src/lib/types.ts`)

All interfaces live here: `ResearchBrief`, `ResearchBriefSections` (17 fields), `OrgEnrichment`, `CompetitorComparison`, `NetworkPerson`, `NewsArticle`, `JobPosting`, `MemoResponse`. When modifying the brief schema, update types first, then workflow, then prompts, then UI.

### Styling

Dark theme via CSS custom properties in `globals.css`:
- `--bg: #0a0a0f`, `--surface: #13131a`, `--accent: #4f8cff`
- `--font-jetbrains` (headings/labels) and `--font-ibm-sans` (body) loaded in `layout.tsx`
- No Tailwind dark mode classes needed — variables handle theming

## Key Conventions

- **`@/*` path alias** maps to `src/` — use `@/lib/types` not relative paths
- **Vercel deployment** — `maxDuration = 60` on both long-running routes
- **No database, no auth** — stateless API, internal tool
- **Optional enrichment nodes** always wrap in try/catch and continue; only log the error
- **Bounded serialization** for memo: truncate lists to first 10 items, cap string fields before sending to Claude
