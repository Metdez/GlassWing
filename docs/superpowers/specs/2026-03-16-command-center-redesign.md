# Command Center CRM Redesign — Design Spec
**Date:** 2026-03-16
**Status:** Approved

---

## Context

The current UI renders an 18-section research brief as a single long-scrolling page with a fixed left sidebar for navigation. Two problems:

1. **No engagement during loading** — a static 5-step progress timeline gives no real feedback during the ~60s research run.
2. **Long-scroll is passive** — analysts want to click into specific signals, not scroll through everything. The format doesn't match how VCs actually work through a deal.

This redesign replaces both with a CRM deal-room pattern: a command center of signal tiles you drill into, and a live narrative loading feed that shows real data as it arrives.

---

## Layout: Command Center

### Company Header (top bar)

Always visible once a brief is loaded:
- Company name (large) + one-line description
- Key metrics inline: stage, employee count, founded year
- Right side: **Generate Memo →** button + **Ask** button (opens chat)
- URL shown subtly; clicking opens a new-search input

### Signal Tile Grid

10 tiles in a **5×2 grid**, each showing a label + computed headline value:

| Tile | Headline value | Border color | Sections in detail panel |
|---|---|---|---|
| TEAM | "N founders" or founder name | default (blue) | foundingTeam, founderDeepDive (18th section), companyLeadership |
| PRODUCT | product name / category | default | product, techStackAnalysis |
| MARKET | TAM or segment name | default | targetMarket, competitiveLandscape |
| COMPETITORS | "N identified" or "—" | default | competitorComparison table, competitorData (see note below) |
| FUNDING | stage (Series H, Seed, etc.) | green | fundingAnalysis, fundingRounds timeline |
| MOAT | first few words of moat | yellow | competitiveMoat, searchPresence |
| ⚠ FLAGS | "N items" | yellow | redFlags |
| PEOPLE | "N leaders" | default | companyLeadership, companyAlumni, jobPostings, hiringSignal |
| INTEL | "N articles" | default | newsAndPress, apolloNewsArticles, recentEvents, aiConsensus |
| FIT | "Strong / Moderate / Weak" | green | glasswingRelevance, networkOpportunity |

**Note on COMPETITORS tile:** `competitorData` (the table) only populates when both `NIMBLE_API_KEY` and `APOLLO_API_KEY` are present. `competitiveMoat`/`moatAiSummary` may be present even when the table is absent (Node 9.5 requires only NIMBLE). In the panel:
- If `competitorData` is populated: show the comparison table.
- If only moat data is present (no table): show moat summary with a "No competitor table — missing Apollo key" note.
- If neither: show "—" headline; tile is non-interactive.

**Note on founderDeepDive:** This is the 18th section added to `ResearchBriefSections`. It lives inside the TEAM detail panel alongside `foundingTeam`. It is not a standalone tile.

Tiles with no data (all fields absent) show a muted "—" headline and are non-interactive (`cursor-default`, no hover effect).

### Below the Tile Grid (always visible)

- **Company Overview card** — `companyOverview` text, rendered as a card below the grid without requiring a tile click. If `companyOverview` is absent or empty (stream not yet complete), show a skeleton placeholder (3 lines of muted background blocks). This is the one section handled below-grid because it is the default context for the entire brief.
- **Competitor comparison table** — same as the COMPETITORS tile panel content, duplicated here for at-a-glance access.

### Detail Panel (push layout)

When a tile is clicked:
- The layout transitions using `width`-based CSS:
  - Grid wrapper: `width: 100%` → `width: 45%` with `transition: width 300ms ease; overflow: hidden`
  - Panel wrapper: `width: 0` → `width: 55%` with `transition: width 300ms ease; overflow: hidden`
  - Parent container: `display: flex; flex-direction: row; width: 100%`
- Active tile gets an accent border
- Panel header shows section title + close button (×)
- Clicking × or the active tile again: panel collapses back to `width: 0`
- Clicking a different tile: swaps panel content without collapse/reopen flash
- Panel content: rendered using existing `BriefSection` card components, same typography/color variants

---

## Loading State: Narrative Feed

Replace the static 5-step progress timeline with a **live message feed** driven by actual stream events.

### Page state context

The current `page.tsx` has **five** states: `idle | loading | streaming | done | memo`.
- `loading` — from form submit until first stream event (`init`)
- `streaming` — from `init` until `done`; partial brief data is being rendered in `ResearchBriefComponent` at the same time

The loading message feed is **only shown during the `loading` state** (before `init` arrives). Once `streaming` begins, the tile grid renders (with skeleton tiles for sections not yet populated), and messages are no longer shown. This means the narrative feed covers the initial wait period (typically 5–15s) before the first data arrives.

During `streaming`, tiles that have no data yet show a skeleton state (muted background, no headline, non-interactive). They fill in as events arrive and `partialBrief` is updated via `setPartialBrief`.

### Message mapping (loading state only)

All messages are generated between form submit and the first `init` event:

| Trigger | Message |
|---|---|
| Form submit | `Analyzing {companyUrl}...` |
| After ~2s | `Scraping website content...` |
| After ~5s | `Running competitive intelligence...` |
| After ~10s | `Enriching company data...` |
| After ~20s | `Identifying leadership team...` |
| After ~35s | `Running AI analysis across all signals...` |

These are **time-based approximations** shown during the `loading` state (before `init`). Once `init` arrives, the state transitions to `streaming` and the tile grid appears. The messages do not need to map to real stream events — they just give the user a sense of progress during the wait.

This is simpler and more reliable than trying to map messages to stream events that don't always fire (optional APIs, no Perplexity/SERP stream events).

### LoadingMessage type

Not needed. Messages are generated by a simple time-based array in `LoadingState.tsx` using `useEffect` timers. No new types required in `types.ts`.

---

## Tile Rendering During Streaming

During the `streaming` state, `ResearchBriefComponent` renders with `partialBrief` (which fills in as events arrive):

- Tiles whose data is present in `partialBrief`: render normally with headline value
- Tiles whose data is not yet in `partialBrief`: render with a skeleton state (muted gray background for the headline area, `animate-pulse` or a CSS pulse animation)
- Skeleton tiles are non-interactive (no click handler)
- Once `state === 'done'`, all tiles should be fully populated; any still empty show "—"

---

## Component Changes

### `page.tsx`

- Remove `BriefSidebar` import and usage
- Remove `activeSectionId` and `IntersectionObserver` logic (sidebar navigation is gone)
- Layout when `state === 'streaming' || state === 'done'`: full-width `ResearchBriefComponent`, no sidebar
- `LoadingState` receives no new props; it manages its own timed messages internally
- No other changes to the state machine or streaming logic

### `LoadingState.tsx` (rewrite)

- Show the URL being analyzed at the top
- Show a list of messages that appear one at a time using `useEffect` timers:
  - 0s: "Analyzing {url}..."
  - 2s: "Scraping website content..."
  - 5s: "Running competitive intelligence..."
  - 10s: "Enriching company data..."
  - 20s: "Identifying leadership team..."
  - 35s: "Running AI analysis across all signals..."
- Each message fades in (`@keyframes fadeInUp`), newest always visible, list grows downward
- Remove the hardcoded 5-step timeline

### `ResearchBrief.tsx` (rewrite)

Responsibilities:
1. Company header (name, one-liner, key metrics, Generate Memo button, Ask button)
2. 5×2 tile grid with headline value computation
3. `activeTile: string | null` state for panel management
4. Two-zone push layout (grid zone + panel zone) via `width` CSS transitions
5. Detail panel rendering (uses `BriefSection` for each section in the active tile's group)
6. Below-grid: overview card + competitor table
7. Skeleton state for tiles during `streaming`

### `BriefSidebar.tsx`

Delete. The component is fully replaced by the tile grid + company header inside `ResearchBrief.tsx`.

### `globals.css`

- Tile hover: `background: var(--surface-hover); border-color: var(--accent);`
- Active tile: `border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent);`
- Tile skeleton: `@keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.7 } }`
- Loading message fade-in: `@keyframes fadeInUp { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }`
- Panel layout: transitions on `.grid-zone` and `.panel-zone` using `width` and `overflow: hidden`

### `types.ts`

No new types needed. `LoadingMessage` is not required (timed approach needs no type).

---

## Headline Value Computation

Pure functions inside `ResearchBrief.tsx`, best-effort (return `"—"` if data is absent):

```ts
getTeamHeadline(brief): string
  // Try to extract founder count from foundingTeam text; fallback to first line/sentence
  // If empty → "—"

getFitHeadline(brief): string
  // Extract "Strong"/"Moderate"/"Weak" from first sentence of glasswingRelevance
  // Simple regex: /\b(strong|moderate|weak|high|low)\b/i
  // If no match → first 3 words of glasswingRelevance
  // If empty → "—"

getFlagsHeadline(brief): string
  // Count lines starting with -, •, *, or numbered (1.) in redFlags
  // If count >= 2: "{n} items"
  // If count is 0 or 1 (paragraph format): "See flags"
  // If empty: "—"

getProductHeadline(brief): string
  // First 4 words of product section
  // If empty → "—"

getMarketHeadline(brief): string
  // Look for "$XB" or "$XM" TAM pattern in targetMarket
  // Fallback: first 3 words
  // If empty → "—"

getCompetitorsHeadline(brief): string
  // Count competitors in competitorData array
  // "{n} identified" or "—" if empty/absent

getFundingHeadline(brief): string
  // orgEnrichment.stage ?? first word of fundingAnalysis ?? "—"

getMoatHeadline(brief): string
  // First 4 words of competitiveMoat ?? "—"

getPeopleHeadline(brief): string
  // companyLeadership?.length → "{n} leaders"
  // If absent → "—"

getIntelHeadline(brief): string
  // apolloNewsArticles?.length → "{n} articles"
  // If absent → first 3 words of newsAndPress ?? "—"
```

---

## What Doesn't Change

- `/api/research`, `/api/memo`, `/api/chat` — no backend changes
- `BriefChat.tsx` — floating chat panel, unchanged
- `InvestmentMemo.tsx` — memo view, unchanged
- `page.tsx` state machine (`idle → loading → streaming → done → memo`) — preserved
- `BriefSection.tsx` — reused inside detail panels
- `SearchForm.tsx` — unchanged

---

## Verification

1. `npm run build` passes with no TypeScript errors
2. Submit a URL → loading state shows timed narrative messages one by one
3. First stream data arrives → transitions to tile grid with skeleton tiles for unpopulated sections
4. Brief fully loads (`done`) → all 10 tiles have headline values or "—"; overview card and competitor table visible below
5. Click a tile → grid compresses to ~45%, detail panel expands to ~55% with correct content
6. Click active tile or × → panel closes, grid re-expands
7. Click a different tile while panel is open → content swaps without visual flash
8. Tiles with no data show "—" and are non-interactive
9. With only `ANTHROPIC_API_KEY` + `FIRECRAWL_API_KEY` set (all optional APIs absent): all tiles show "—" except those populated from Claude analysis; no runtime errors
10. "Generate Memo →" button works; memo view unchanged
11. Chat button works; chat panel unchanged
