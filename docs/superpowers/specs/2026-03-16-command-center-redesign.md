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

Always visible once a brief is loaded. Rendered inside `ResearchBrief.tsx`:
- Company name (large) + one-line description
- Key metrics inline: stage, employee count, founded year
- Right side: **Generate Memo →** button (calls `onGenerateMemo`; disabled when `memoLoading`) + **Ask** button (calls `onAsk`)
- URL shown subtly as a clickable element; clicking calls `onNewSearch` prop, which in `page.tsx` resets state to `idle` (returning to `SearchForm`)

The `memoLoading` overlay and `memoError` banner remain in `page.tsx`. `ResearchBrief.tsx` only receives `memoLoading: boolean` to disable the button; the overlay is not moved.

### Signal Tile Grid

10 tiles in a **5×2 grid**, each showing a label + computed headline value:

| Tile | Headline value | Tile border | Sections/data in detail panel |
|---|---|---|---|
| TEAM | "N founders" regex or first sentence | default (accent blue) | foundingTeam, founderDeepDive, perplexityTeamResearch, perplexityTeamCitations (as citation links), companyLeadership |
| PRODUCT | first 4 words of product | default | product, techStackAnalysis, tech stack pills (from orgEnrichment.technologies), departmental headcount bars (from orgEnrichment.departments) |
| MARKET | "$XB" TAM regex or first 3 words | default | targetMarket, competitiveLandscape |
| COMPETITORS | "N identified" or "—" | default | competitorComparison (text), competitorData table — see note |
| FUNDING | orgEnrichment.stage or "—" | accent-green | fundingAnalysis, fundingRounds timeline, funding metrics from orgEnrichment |
| MOAT | first 4 words of competitiveMoat | accent-orange | competitiveMoat, searchPresence |
| ⚠ FLAGS | "N items" / "See flags" / "—" | accent-orange | redFlags |
| PEOPLE | "N leaders" | default | companyLeadership list, companyAlumni list, jobPostings (rich category-grouped rendering — see note), hiringSignal |
| INTEL | "N articles" | default | newsAndPress (BriefSection), apolloNewsArticles timeline (custom rendering — see note), recentEvents, aiConsensus, chatgptSays (collapsible), perplexitySays (collapsible) |
| FIT | "Strong / Moderate / Weak" | accent-green | glasswingRelevance, networkOpportunity |

**Tile border colors are tile-level only.** `BriefSection` variant system (`default`, `warning`, `positive`) is unchanged; no new variants needed. MOAT and FLAGS tiles use `--accent-orange: #f59e0b` as the tile border color, but their panels still use `variant="warning"`.

**COMPETITORS tile notes:**
- Both NIMBLE + APOLLO: show table + competitorComparison text.
- Only NIMBLE: show moatAiSummary text + "No competitor table — Apollo key not configured."
- Neither: tile shows "—", non-interactive.

**PEOPLE tile note:** Preserve the existing rich job postings rendering (category-grouped cards with linked titles). This is a custom block inside the panel, not a `BriefSection`.

**INTEL tile note:** Preserve the existing Apollo news feed timeline rendering (category-colored pill badges, publication dates). This is a custom block inside the panel, not a `BriefSection`.

**`newsResults` (`NewsResult[]`):** Drop from the new UI. It was only used implicitly in `searchPresence` text.

**founderDeepDive** is the 18th section; placed in TEAM panel. `perplexityTeamResearch` (the raw Perplexity Sonar response) is also placed in TEAM panel, collapsed by default, labeled "Perplexity Source." `perplexityTeamCitations` renders as a list of citation links at the bottom of the TEAM panel.

Tiles with no data show "—" and are non-interactive (`cursor-default`, no hover, no click handler).

### Below the Tile Grid (always visible)

- **Company Overview card** — `companyOverview` rendered as a `BriefSection` card. If absent/empty during `streaming`, show a skeleton placeholder (3 muted background blocks). Not gated behind a tile click.
- **Competitor comparison table** — only rendered when `competitorData` is populated; same conditional logic as the COMPETITORS tile panel. Hidden entirely otherwise.

### Detail Panel (push layout)

When a tile is clicked:
- Parent container: `display: flex; flex-direction: row; width: 100%; align-items: flex-start`
- Grid zone: `width: 100%` → `width: 45%` with `transition: width 300ms ease; overflow: hidden; flex-shrink: 0`
- Panel zone: `width: 0` → `width: 55%` with `transition: width 300ms ease; overflow: hidden; flex-shrink: 0`; `overflow-y: auto` once open (set via class toggle after transition completes, or use `max-height: calc(100vh - 120px); overflow-y: auto`)
- Active tile: `border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent)`
- Panel header: section title + × close button
- Clicking × or the active tile again collapses panel
- Clicking a different tile swaps content without collapse/reopen flash

---

## Loading State: Narrative Feed

Replace the static 5-step timeline with a **live time-based message feed**.

### Page state context

The current `page.tsx` has five states: `idle | loading | streaming | done | memo`.
- `loading` — from form submit until first `init` stream event (typically 5–15s)
- `streaming` — from `init` until `done`; partial brief renders

The narrative feed is **only shown during `loading`**. Once `init` arrives → `streaming` → tile grid appears.

### Loading messages (time-based)

`LoadingState.tsx` manages messages internally with `useEffect` + `setTimeout`. Receives `url: string` prop (already passed from `page.tsx`):

| Delay | Message |
|---|---|
| 0ms | `Analyzing {url}...` |
| 2s | `Scraping website content...` |
| 5s | `Running competitive intelligence...` |
| 10s | `Enriching company data...` |
| 20s | `Identifying leadership team...` |
| 35s | `Running AI analysis across all signals...` |

Messages fade in. Return a cleanup function from `useEffect` that calls `clearTimeout` on all pending timers.

---

## Tile Rendering During Streaming

During `streaming`, tiles are rendered with `partialBrief`:
- Tiles with data: render with computed headline, fully interactive
- Tiles without data yet: skeleton state (muted gray, pulse animation, non-interactive)
- After `done`: empty tiles show static "—"

---

## Component Changes

### `page.tsx`

- Remove `BriefSidebar` import/usage
- Remove `activeSectionId` state and `IntersectionObserver` logic
- Layout for `streaming`/`done`: full-width `ResearchBriefComponent`, no sidebar
- `ResearchBriefComponent` receives new props: `onGenerateMemo`, `memoLoading`, `memoError`, `onAsk`, `onNewSearch: () => void` (sets state back to `idle`)
- `page.tsx` retains: `chatOpen` state, `memoLoading`, `memoError`, `handleGenerateMemo`, memo overlay rendering

### `LoadingState.tsx` (rewrite)

- Props: `url: string`
- Timed message list via `useEffect`
- `fadeInUp` animation per message
- Cleanup: `clearTimeout` on all timers on unmount
- Remove the 5-step timeline

### `ResearchBrief.tsx` (rewrite)

Props:
```ts
brief: ResearchBrief (or Partial<ResearchBrief> during streaming)
onGenerateMemo: () => void
memoLoading: boolean
memoError?: string | null
onAsk: () => void
onNewSearch: () => void
```

Responsibilities:
1. Company header
2. 5×2 tile grid + headline computation
3. `activeTile: string | null` state
4. Two-zone push layout
5. Detail panel with `BriefSection` cards + preserved custom blocks (job postings, news timeline)
6. Below-grid: overview card + competitor table

### `BriefSidebar.tsx`

Delete entirely.

### `globals.css`

```css
/* New variable */
--accent-orange: #f59e0b;

/* Tiles */
.signal-tile:hover { background: var(--surface-hover); border-color: var(--accent); }
.signal-tile.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.signal-tile.empty { cursor: default; opacity: 0.5; }

/* Skeleton */
@keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.7 } }
.tile-skeleton { animation: pulse 1.5s ease-in-out infinite; }

/* Loading messages */
@keyframes fadeInUp { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }
.loading-message { animation: fadeInUp 0.3s ease forwards; }

/* Push layout */
.brief-grid-zone { transition: width 300ms ease; overflow: hidden; flex-shrink: 0; }
.brief-panel-zone { transition: width 300ms ease; overflow: hidden; flex-shrink: 0; max-height: calc(100vh - 120px); overflow-y: auto; }
```

### `types.ts`

No new types needed.

---

## Headline Value Computation

Pure functions in `ResearchBrief.tsx`:

```ts
getTeamHeadline(brief): string
  // /(\d+)\s+(?:co-)?founder/i on foundingTeam → "{n} founders"
  // fallback: first sentence up to 30 chars
  // if empty → "—"

getFitHeadline(brief): string
  // /\b(strong|moderate|weak|high|low)\b/i → capitalize match
  // fallback: first 3 words; if empty → "—"

getFlagsHeadline(brief): string
  // if redFlags empty/absent → "—"
  // count lines /^[-•*]|\d+\./ → if >= 2: "{n} items"
  // if non-empty but 0 or 1 matches (paragraph form) → "See flags"

getProductHeadline(brief): string
  // first 4 words of product; if empty → "—"

getMarketHeadline(brief): string
  // /\$[\d.]+[BM]/ on targetMarket → that value
  // fallback: first 3 words; if empty → "—"

getCompetitorsHeadline(brief): string
  // competitorData?.length → "{n} identified"
  // fallback: competitors?.length → "{n} found"
  // if empty → "—"

getFundingHeadline(brief): string
  // orgEnrichment?.stage ?? first word of fundingAnalysis ?? "—"

getMoatHeadline(brief): string
  // first 4 words of competitiveMoat ?? "—"

getPeopleHeadline(brief): string
  // companyLeadership?.length → "{n} leaders"; if empty → "—"

getIntelHeadline(brief): string
  // apolloNewsArticles?.length → "{n} articles"
  // fallback: first 3 words of newsAndPress ?? "—"
```

---

## What Doesn't Change

- `/api/research`, `/api/memo`, `/api/chat` — no backend changes
- `BriefChat.tsx` — unchanged; `chatOpen` + rendering stay in `page.tsx`
- `InvestmentMemo.tsx` — unchanged
- `page.tsx` state machine — preserved
- `BriefSection.tsx` — reused; no new variants
- `SearchForm.tsx` — unchanged
- Memo overlay in `page.tsx` — stays in `page.tsx`

---

## Verification

1. `npm run build` — no TypeScript errors
2. Submit URL → timed narrative messages appear during `loading` state
3. First stream event → transitions to tile grid; unpopulated tiles show skeleton pulse
4. `done` → all tiles have values or "—"; overview card + competitor table visible below grid
5. Click tile → grid compresses ~45%, detail panel expands ~55% with correct content; panel is scrollable
6. Click active tile or × → panel collapses, grid re-expands
7. Click different tile while open → content swaps without flash
8. Empty tiles are non-interactive ("—", no hover, no click)
9. Only `ANTHROPIC_API_KEY` + `FIRECRAWL_API_KEY`: Claude-backed tiles have values; all optional tiles show "—"; no errors
10. Only NIMBLE (no Apollo): COMPETITORS tile shows moat summary + "Apollo key not configured"
11. Generate Memo → works; overlay in `page.tsx` shows; button disabled during load
12. Ask button → chat panel opens
13. URL click in header → resets to `idle` / `SearchForm`
14. TEAM panel: foundingTeam text, founderDeepDive, perplexityTeamResearch (collapsed), citation links visible
15. PRODUCT panel: text sections + tech pills + headcount bars visible
16. PEOPLE panel: leadership list, alumni list, category-grouped job postings, hiringSignal text
17. INTEL panel: news timeline with badges, newsAndPress text, chatgptSays/perplexitySays collapsible
18. Console: no "state update on unmounted component" warnings from `LoadingState` timers
