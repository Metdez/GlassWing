import type { JobPosting, NewsArticle, NewsResult, NetworkPerson, OrgEnrichment, CompetitorComparison } from './types';

export const RESEARCH_SYSTEM_PROMPT = `You are a senior VC analyst conducting a first-pass due diligence screen at Glasswing Ventures.

ABOUT GLASSWING VENTURES:
Glasswing is an early-stage venture fund (Seed to Series B) that backs AI-native and AI-enabled enterprise companies. Core thesis areas: (1) AI/ML infrastructure and tooling, (2) enterprise cybersecurity with AI components, (3) intelligent automation for business processes, (4) deep tech with defensible IP. Glasswing does NOT invest in consumer apps, pure-play SaaS without AI differentiation, crypto/Web3, or hardware without a software moat. Typical check: $1M–$5M at initial entry.

YOUR TASK:
Analyze the provided company data (website content, search results, news, people data, funding history, job postings, competitor research) and produce a structured deal screen brief. This brief will be the first document a Glasswing partner reads before deciding whether to take a meeting.

REASONING INSTRUCTION:
Before producing the JSON, mentally work through each section in order. Ask yourself: what does the evidence actually support? Where are there gaps? Where do multiple sources agree or conflict? This internal reasoning should improve the quality of your output — do not include the reasoning in your response.

DATA CONFIDENCE LEVELS:
When writing each section, distinguish between:
- Facts confirmed by the source data (cite them directly)
- Reasonable inferences from the data (signal with "suggests" or "indicates")
- Information not available (use exactly: "Not available — requires further diligence")
Do NOT invent funding amounts, team credentials, revenue figures, customer names, or technical claims that are not in the source data.

CRITICAL: Respond ONLY with valid JSON matching the exact schema in the user message. No markdown, no backticks, no commentary before or after the JSON object.`;

export function buildUserPrompt(
  markdown: string,
  url: string,
  googleSerpMarkdown?: string | null,
  chatgptResponse?: string,
  perplexityResponse?: string,
  newsArticles: NewsArticle[] = [],
  orgEnrichment?: OrgEnrichment,
  jobPostings: JobPosting[] = [],
  totalJobPostings: number = 0,
  newsAiSummary: string = '',
  newsResults: NewsResult[] = [],
  leadership: NetworkPerson[] = [],
  alumni: NetworkPerson[] = [],
  competitors?: CompetitorComparison[],
  competitorAiSummary: string = '',
  competitorResults: { title: string; description: string }[] = [],
  moatAiSummary: string = '',
  aboutPageMarkdown?: string | null,
  founderSearchSummary?: string | null,
  perplexityTeamResearch?: string | null,
  perplexityTeamCitations: string[] = [],
): string {
  const serpSection = googleSerpMarkdown
    ? `\nGoogle Search Results for "${url}":\n${googleSerpMarkdown.slice(0, 3000)}\n`
    : '';

  const aiPlatformSection = (chatgptResponse || perplexityResponse)
    ? `\nWhat other AI platforms say about this company:\n\nChatGPT's response:\n${(chatgptResponse ?? 'Response unavailable').slice(0, 2000)}\n\nPerplexity's response:\n${(perplexityResponse ?? 'Response unavailable').slice(0, 2000)}\n`
    : '';

  const newsSection = newsArticles.length > 0
    ? `\nApollo News & Events:\n${newsArticles.map(a => `- [${a.categories.join(', ')}] "${a.title}" (${a.source}, ${a.publishedAt})\n  ${a.snippet}`).join('\n')}\n`
    : `\nApollo News & Events:\nNo news articles found in Apollo's database — company may be early-stage or not yet covered by press.\n`;

  const nimbleNewsSection = (newsAiSummary || newsResults.length > 0)
    ? `\nRecent News (last 12 months):\n${newsAiSummary ? `Summary: ${newsAiSummary}\n` : ''}${newsResults.map(r => `- "${r.title}" — ${r.description}${r.publishedDate ? ` (${r.publishedDate})` : ''}\n  ${r.url}`).join('\n')}\n`
    : '';

  const aboutPageSection = aboutPageMarkdown
    ? `\nTeam / About Page Content:\n${aboutPageMarkdown}\n`
    : '';

  const founderSearchSection = founderSearchSummary
    ? `\nFounder & Team Web Search:\n${founderSearchSummary}\n`
    : '';

  const perplexityTeamSection = perplexityTeamResearch
    ? `\nFounding Team Deep Research (Perplexity Sonar — live web, cited):\n${perplexityTeamResearch}\n${perplexityTeamCitations.length > 0 ? `Sources: ${perplexityTeamCitations.join(', ')}\n` : ''}`
    : '';

  const networkSection = (leadership.length > 0 || alumni.length > 0)
    ? `\nApollo People Data:\nCurrent Leadership:\n${
        leadership.length > 0
          ? leadership.map(p => `- ${p.name}, ${p.title}${p.location ? ` (${p.location})` : ''}${p.linkedinUrl ? ` — ${p.linkedinUrl}` : ''}`).join('\n')
          : '  None found'
      }\nNotable Alumni:\n${
        alumni.length > 0
          ? alumni.map(p => `- ${p.name}, formerly ${p.title}${p.location ? ` (${p.location})` : ''}`).join('\n')
          : '  None found'
      }\n`
    : '';

  const orgSection = orgEnrichment
    ? `\nApollo Organization Data:
- Company: ${orgEnrichment.name}, founded ${orgEnrichment.foundedYear}
- Industry: ${orgEnrichment.industry}
- Employees: ${orgEnrichment.employeeCount?.toLocaleString() ?? 'Unknown'}
- Annual Revenue: ${orgEnrichment.annualRevenue ? `$${orgEnrichment.annualRevenue}` : 'Unknown'}
- Total Funding: ${orgEnrichment.totalFunding ? `$${orgEnrichment.totalFunding}` : 'Unknown'} (Latest: ${orgEnrichment.latestFundingStage || 'Unknown'} on ${orgEnrichment.latestFundingDate ? new Date(orgEnrichment.latestFundingDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'})
- Funding History:
${orgEnrichment.fundingRounds.length > 0
  ? orgEnrichment.fundingRounds.map(r => `  ${r.type}: ${r.currency}${r.amount} (${r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}) — Investors: ${r.investors}`).join('\n')
  : '  No funding rounds on record'}
- Tech Stack: ${orgEnrichment.techStack.length > 0 ? orgEnrichment.techStack.join(', ') : 'Unknown'}
- Department Breakdown: ${Object.entries(orgEnrichment.departmentalHeadcount).map(([dept, count]) => `${dept}: ${count}`).join(', ')}
- Location: ${[orgEnrichment.city, orgEnrichment.state, orgEnrichment.country].filter(Boolean).join(', ')}
${orgEnrichment.keywords?.length ? `- Keywords: ${orgEnrichment.keywords.join(', ')}` : ''}
`
    : '';

  const competitorSection = (orgEnrichment && competitors && competitors.length > 0)
    ? `\nCompetitor Comparison Data (from Apollo):
Target Company: ${orgEnrichment.name} — ${orgEnrichment.employeeCount?.toLocaleString() ?? 0} employees, ${orgEnrichment.totalFunding || 'N/A'} funding, ${orgEnrichment.annualRevenue || 'N/A'} revenue, founded ${orgEnrichment.foundedYear}
${competitors.map(c => `Competitor: ${c.name} — ${c.employeeCount?.toLocaleString() ?? 0} employees, ${c.totalFunding} funding, ${c.annualRevenue} revenue, founded ${c.foundedYear}`).join('\n')}
`
    : '';

  const competitiveSection = (competitorAiSummary || competitorResults.length > 0 || moatAiSummary)
    ? `\n---\nCompetitive Intelligence (via NimbleWay):\n${
        competitorAiSummary ? `Competitor search AI summary: ${competitorAiSummary}\n` : ''
      }${
        competitorResults.length > 0
          ? `Competitor results:\n${competitorResults.map(c => `- ${c.title}: ${c.description}`).join('\n')}\n`
          : ''
      }${
        moatAiSummary ? `\nMoat/Defensibility research AI summary: ${moatAiSummary}\n` : ''
      }
Given all of this, answer these questions that a VC would ask:
1. Who are the top 3-5 direct competitors?
2. Why can't a large incumbent (like NVIDIA, Google, Microsoft, Amazon) simply build this themselves?
3. What is this company's defensible moat? (network effects, proprietary data, switching costs, technical complexity, regulatory advantage, speed to market)
4. Where is this company vulnerable?
`
    : '';

  const jobPostingsSection = `\nActive Job Postings (${totalJobPostings} found):\n${
    totalJobPostings === 0
      ? 'No active job postings found — flag this as a potential concern about hiring activity.'
      : jobPostings.map(j => `- ${j.title} (${j.country || 'Remote'}, posted ${j.postedAt})`).join('\n')
  }\n`;

  return `You are screening ${url} for potential investment. Work through the data below and produce a comprehensive deal brief JSON.

CROSS-SOURCE RECONCILIATION RULE: When sources conflict (e.g., website claims differ from Apollo data, or ChatGPT and Perplexity disagree), note the discrepancy explicitly in the relevant section rather than picking one answer silently. Discrepancies are often the most useful signal.

Company URL: ${url}
${serpSection}
Website Content (primary source — most authoritative for product/positioning):
${markdown.slice(0, 12000)}
${aiPlatformSection}${aboutPageSection}${founderSearchSection}${perplexityTeamSection}${newsSection}${orgSection}${nimbleNewsSection}${networkSection}${jobPostingsSection}${competitorSection}${competitiveSection}

INSTRUCTIONS FOR EACH FIELD:
- companyName: Extract the official company name exactly as presented on the website.

- sections.companyOverview: Write 3–4 sentences covering: (1) what the company does in plain language, (2) who the primary buyer is, (3) the core value proposition, (4) the company's current stage/traction in one phrase. Do not use marketing language from the website verbatim — synthesize and de-jargon.

- sections.foundingTeam: PRIORITIZE Perplexity Sonar deep research if available — it contains live, cited data. For each founder/executive: name, title, prior companies, education, notable exits. Flag if the team is first-time vs. serial founders, technical-heavy vs. sales-heavy, complete (technical + business) vs. incomplete. If team info is sparse, flag as a diligence gap.

- sections.founderDeepDive: For each individual founder or key executive, write a 2-3 sentence VC-memo-style profile covering who they are, what makes them credible (or not), and why they are (or aren't) the right person to build this. Format each entry as: "**[Name], [Title]** — [profile sentences]". Use Perplexity Sonar data as the primary source when available. If team data is genuinely sparse, say so and flag it as a diligence gap rather than inventing details.

- sections.product: Answer: (1) Core product type — SaaS, API, platform, services? (2) Specific problem it solves? (3) How it works technically? (4) Delivery model — cloud, on-prem, hybrid? (5) Pricing model if discernible? Do not repeat marketing slogans.

- sections.targetMarket: Answer: (1) ICP — company size, industry, role? (2) Addressable market size — cite figures or label as estimate? (3) Verticals explicitly mentioned? (4) Horizontal platform or vertical-specific? (5) Geographic markets targeted?

- sections.competitiveLandscape: Name 3–6 direct competitors. For each: what they do + key differentiator vs. target. Is the company competing on price, technology, distribution, or customer experience? Is the market crowded, fragmented, or dominated by an incumbent?

- sections.redFlags: List each concern as a separate point. Check for: vague AI claims without explanation, no named customers or case studies, anonymous founding team, no pricing disclosed for an enterprise product, no security/compliance mention for a data-handling product, stale website, unusual headcount for claimed stage, funding gap. If no red flags, state that explicitly — do not leave this section empty.

- sections.glasswingRelevance: Score as STRONG FIT / MODERATE FIT / WEAK FIT / NOT A FIT. Then explain: (1) Which Glasswing thesis area(s) does this map to? (2) Specific value-add Glasswing can provide beyond capital? (3) Is the stage and check size appropriate? (4) What would need to be true for this to be a strong deal? A "not a fit" verdict is valuable — be honest.

- sections.searchPresence: Analyze the Google SERP data: (1) Do they rank for their own brand name? (2) Running paid ads? (3) Appear in industry comparison articles? (4) What does the search snippet say about market perception? (5) Any negative search results? If no SERP data, note that limitation.

- sections.aiConsensus: Synthesize ChatGPT + Perplexity: (1) Do they agree on what the company does? (2) Agree on competitive set? (3) Overall sentiment — well-known, niche, or obscure? (4) Contradictions with the website? (5) What does the level of AI knowledge imply about the company's market presence?

- sections.recentEvents: Construct a narrative timeline from Apollo news: (1) 3–5 most significant events in chronological order? (2) Trajectory — accelerating, plateauing, or declining? (3) Expected event types that are missing? (4) What does the cadence suggest about momentum? If no Apollo news, note this as a signal.

- sections.newsAndPress: Analyze recent news: (1) Tier-1 press or only trade press? (2) Dominant narrative? (3) Coverage contradicts company messaging? (4) How recent — is there a gap that suggests a slowdown? (5) Share-of-voice vs. competitors if data allows.

- sections.hiringSignal: Analyze job postings: (1) Engineering/sales/leadership ratio? (2) Specific technical skills being hired for? (3) US or nearshore? (4) Post-funding ramp signals? (5) Executive/VP openings that suggest a new-stage build-out? (6) Does headcount from Apollo match hiring activity? If no job postings, explicitly flag this as unusual and state what it may imply.

- sections.fundingAnalysis: (1) Total raised, stages, dates — is the cadence healthy? (2) Investor quality? (3) Implied runway and next likely raise window? (4) Is funding appropriate for the claimed product maturity and team size? (5) Flag concerns: down round signals, very long time between rounds, unusual round sizing. If no funding data, note and flag for diligence.

- sections.techStackAnalysis: (1) Stack modern and scalable or legacy? (2) Build-vs-buy philosophy? (3) Dependencies on specific AI model providers (OpenAI API, AWS Bedrock) that create margin risk? (4) Engineering headcount matches claimed product complexity? (5) Where does the core IP likely live? If unavailable, infer from product description and engineering job postings.

- sections.networkOpportunity: For each named leader and alumni: (1) Who at Glasswing or in its portfolio network has a direct connection? (2) Previous employers that yield reference calls? (3) Alumni now at Glasswing portfolio companies — a warm intro path? (4) Best first outreach path? If data is sparse, note the limitation and suggest what research would surface it.

- sections.competitorComparison: Using Apollo comparison data: (1) How does the target rank vs. competitors on employee count, funding, and revenue? (2) Which competitor is most dangerous and why? (3) Any competitors backed by Glasswing-adjacent funds? (4) What does the funding gap or lead vs. competitors imply? If no comparison table data, use competitive intelligence research for a narrative comparison.

- sections.competitiveMoat: Structure as four labeled paragraphs:
  COMPETITORS: Top 3–5 direct competitors with one sentence each on positioning.
  INCUMBENT RISK: Why can't a large incumbent (name the most likely: NVIDIA, Google, Microsoft, AWS, Salesforce, ServiceNow) simply build this? Name specific barriers: proprietary training data, customer relationships, network effects, regulatory certifications, niche expertise.
  MOAT TYPE: Identify primary moat type(s) — data moat, network effects, switching costs, technical complexity, regulatory/compliance advantage, first-mover in niche, distribution exclusivity. Provide one concrete evidence point per claimed moat.
  VULNERABILITY: Where is the company weakest? Where could a well-funded competitor erode their position? Be specific. If competitive intelligence data was limited, reason from first principles and note the limitation.

- competitors array: Populate using Apollo comparison data when available. Each entry: name (exact company name), url (domain from data, or best-known URL if not in data, empty string if truly unknown), description (one sentence: what they do AND how they differ from the target on one specific dimension), threat (one sentence: the specific risk this competitor poses to the target — e.g. distribution advantage, superior funding, incumbent brand, faster shipping velocity, or dominant market share). Do not invent competitor companies — only list ones confirmed by the research. Maximum 5 entries.

Respond with this exact JSON structure. Every field must be populated — use "Not available — requires further diligence" only as a last resort when evidence is genuinely absent:
{
  "companyName": "string",
  "sections": {
    "companyOverview": "string",
    "foundingTeam": "string",
    "product": "string",
    "targetMarket": "string",
    "competitiveLandscape": "string",
    "redFlags": "string",
    "glasswingRelevance": "string",
    "searchPresence": "string",
    "aiConsensus": "string",
    "recentEvents": "string",
    "newsAndPress": "string",
    "hiringSignal": "string",
    "fundingAnalysis": "string",
    "techStackAnalysis": "string",
    "networkOpportunity": "string",
    "competitorComparison": "string",
    "competitiveMoat": "string",
    "founderDeepDive": "string — per-founder 2-3 sentence VC memo profiles formatted as **Name, Title** — profile sentences."
  },
  "competitors": [
    {
      "name": "string — exact competitor company name",
      "url": "string — competitor domain, empty string if unknown",
      "description": "string — one sentence: what they do and one specific way they differ from or compete with the target company",
      "threat": "string — one sentence: the specific risk this competitor poses to the target company"
    }
  ]
}`;
}
