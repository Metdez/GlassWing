import { NodeRegistry, ExecutionContext } from '@jam-nodes/core';
import type { NodeDefinition } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { RESEARCH_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { WorkflowResult, ResearchBrief, NewsArticle, JobPosting, NewsResult, NetworkPerson, OrgEnrichment, CompetitorComparison } from './types';

export type StreamEvent =
  | { type: 'init'; data: { companyName: string; companyUrl: string; scrapedAt: string; metadata: { pageTitle: string; pageDescription: string; sourceUrl: string } } }
  | { type: 'ai_insights'; data: { chatgptSays?: string; perplexitySays?: string } }
  | { type: 'enrichment'; data: { orgEnrichment?: OrgEnrichment; apolloNewsArticles?: NewsArticle[]; jobPostings?: JobPosting[]; totalJobPostings?: number; newsResults?: NewsResult[]; newsAiSummary?: string } }
  | { type: 'people'; data: { companyLeadership?: NetworkPerson[]; companyAlumni?: NetworkPerson[] } }
  | { type: 'competitors'; data: { competitorData?: CompetitorComparison[]; competitors?: { name: string; url: string; description: string; threat?: string }[]; moatAiSummary?: string } }
  | { type: 'analysis'; data: { sections: ResearchBrief['sections'] } }
  | { type: 'done'; data: ResearchBrief }
  | { type: 'error'; data: { error: string } };

function mapApolloPersons(people: any[]): NetworkPerson[] {
  return (people ?? []).map((p: any) => ({
    name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title ?? '',
    company: p.organization?.name ?? '',
    linkedinUrl: p.linkedin_url ?? undefined,
    location: [p.city, p.state].filter(Boolean).join(', ') || undefined,
  }));
}

// Initialize the jam-nodes registry once (reused across requests)
const registry = new NodeRegistry();
registry.registerAll(builtInNodes as NodeDefinition[]);

export async function runResearchWorkflow(companyUrl: string, onProgress?: (event: StreamEvent) => void): Promise<WorkflowResult> {
  // Create a fresh execution context for each request
  const ctx = new ExecutionContext({ companyUrl });
  const httpExecutor = registry.getExecutor('http_request');
  if (!httpExecutor) {
    return { success: false, error: 'http_request node not found in registry.' };
  }

  // ============================================
  // NODE 1: Scrape the company website via Firecrawl
  // ============================================
  const scrapeResult = await httpExecutor(
    {
      url: 'https://api.firecrawl.dev/v2/scrape',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: {
        url: companyUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      },
      timeout: 45000,
    },
    ctx.toNodeContext('user', 'research-wf')
  );

  if (!scrapeResult.success) {
    return { success: false, error: `Scrape failed: ${scrapeResult.error}` };
  }

  // Store the scrape output in context
  ctx.storeNodeOutput('scrape', scrapeResult.output);

  // Extract the markdown content from Firecrawl response
  const scrapeBody = scrapeResult.output as any;
  const markdown = scrapeBody?.body?.data?.markdown;
  const metadata = scrapeBody?.body?.data?.metadata || {};

  if (!markdown || markdown.length < 50) {
    return { success: false, error: 'Website returned insufficient content to analyze.' };
  }

  // Derive company name for search queries (used by multiple nodes below)
  const companyNameForSearch =
    (metadata.title as string | undefined)?.split(/[—|·\-]/)[0]?.trim() ||
    (() => { try { return new URL(companyUrl).hostname.replace(/^www\./, ''); } catch { return companyUrl; } })();

  // ============================================
  // NODE 1.5: Firecrawl about/team page scraping (parallel, optional)
  // ============================================
  let aboutPageMarkdown: string | null = null;

  try {
    const baseDomain = (() => {
      try {
        const u = new URL(companyUrl);
        return `${u.protocol}//${u.hostname}`;
      } catch { return companyUrl; }
    })();

    const aboutPaths = ['/about', '/about-us', '/team', '/company/team', '/company'];
    const aboutResults = await Promise.allSettled(
      aboutPaths.map((path) =>
        httpExecutor(
          {
            url: 'https://api.firecrawl.dev/v2/scrape',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: {
              url: `${baseDomain}${path}`,
              formats: ['markdown'],
              onlyMainContent: true,
            },
            timeout: 15000,
          },
          ctx.toNodeContext('user', 'research-wf')
        )
      )
    );

    for (const result of aboutResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        const md = (result.value.output as any)?.body?.data?.markdown;
        if (md && md.length > 200) {
          aboutPageMarkdown = md.slice(0, 4000);
          break;
        }
      }
    }
  } catch {
    // Non-fatal — continue without about page
  }

  onProgress?.({
    type: 'init',
    data: {
      companyName: companyNameForSearch,
      companyUrl,
      scrapedAt: new Date().toISOString(),
      metadata: {
        pageTitle: (metadata.title as string) || '',
        pageDescription: (metadata.description as string) || '',
        sourceUrl: (metadata.sourceURL as string) || companyUrl,
      },
    },
  });

  // ============================================
  // RESULT VARIABLES — declared here so all parallel thunks can write to them
  // ============================================

  // Cross-batch bridging variables
  let apolloOrgId: string | undefined = undefined;
  let node9ASearchAnswer: string | null = null;
  let node9BDomains: string[] = [];

  // Enrichment result accumulators
  let googleSerpMarkdown: string | null = null;
  let chatgptSays: string | undefined;
  let perplexitySays: string | undefined;
  let founderSearchSummary: string | null = null;
  let apolloNewsArticles: NewsArticle[] = [];
  let jobPostings: JobPosting[] = [];
  let companyLeadership: NetworkPerson[] = [];
  let companyAlumni: NetworkPerson[] = [];
  let orgEnrichment: OrgEnrichment | undefined;
  let competitorData: CompetitorComparison[] | undefined;
  let newsResults: NewsResult[] = [];
  let newsAiSummary = '';
  let competitorAiSummary = '';
  let competitorResults: { title: string; description: string }[] = [];
  let moatAiSummary = '';
  let perplexityTeamResearch: string | null = null;
  let perplexityTeamCitations: string[] = [];

  // ============================================
  // BATCH A: 8 independent enrichment nodes run in parallel
  // Nodes 2, 3, 3.5, 4, 8, 9.5, 9.75, 9A
  // ============================================

  // Node 2: Google SERP via NimbleWay
  const node2Thunk = async () => {
    if (!process.env.NIMBLE_API_KEY) return;
    try {
      const serpResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            agent: 'google_search',
            params: { query: companyNameForSearch },
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      if (serpResult.success) {
        ctx.storeNodeOutput('googleSerp', serpResult.output);
        googleSerpMarkdown = (serpResult.output as any)?.body?.data?.markdown ?? null;
      }
    } catch {
      // NimbleWay failure is non-fatal — continue without SERP data
    }
  };

  // Node 3: NimbleWay LLM Agents — ChatGPT + Perplexity (internally parallel)
  const node3Thunk = async () => {
    if (!process.env.NIMBLE_API_KEY) return;
    const nimbleHeaders = {
      'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const [chatgptResult, perplexityResult] = await Promise.allSettled([
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            agent: 'chatgpt',
            params: { query: `What is ${companyNameForSearch}? Who are their competitors and what is their market position?` },
          },
          timeout: 20000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            agent: 'perplexity',
            params: { query: `What is ${companyNameForSearch}? Who founded it, what do they do, and who are their main competitors?` },
          },
          timeout: 20000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
    ]);
    if (chatgptResult.status === 'fulfilled' && chatgptResult.value.success) {
      ctx.storeNodeOutput('chatgptResponse', chatgptResult.value.output);
      chatgptSays = (chatgptResult.value.output as any)?.body?.data?.markdown ?? 'Response unavailable';
    } else {
      chatgptSays = 'Response unavailable';
    }
    if (perplexityResult.status === 'fulfilled' && perplexityResult.value.success) {
      ctx.storeNodeOutput('perplexityResponse', perplexityResult.value.output);
      perplexitySays = (perplexityResult.value.output as any)?.body?.data?.markdown ?? 'Response unavailable';
    } else {
      perplexitySays = 'Response unavailable';
    }
  };

  // Node 3.5: NimbleWay founder/team web search
  const node3_5Thunk = async () => {
    if (!process.env.NIMBLE_API_KEY) return;
    try {
      const founderSearchResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            query: `${companyNameForSearch} founders CEO CTO team background`,
            focus: 'general',
            max_results: 5,
            deep_search: false,
            include_answer: true,
          },
          timeout: 20000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      if (founderSearchResult.success) {
        ctx.storeNodeOutput('founderSearch', founderSearchResult.output);
        founderSearchSummary = (founderSearchResult.output as any)?.body?.answer ?? null;
      }
    } catch {
      // Non-fatal — continue without founder search
    }
  };

  // Node 4: Apollo Org Enrichment
  const node4Thunk = async () => {
    if (!process.env.APOLLO_API_KEY) return;
    try {
      const domain = new URL(companyUrl).hostname.replace(/^www\./, '');
      const orgResult = await httpExecutor(
        {
          url: `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      ctx.storeNodeOutput('orgEnrichment', orgResult.success ? orgResult.output : null);
      const orgBody = orgResult.output as any;
      const org = orgBody?.body?.organization;
      if (org) {
        apolloOrgId = org.id;
        orgEnrichment = {
          name: org.name ?? '',
          foundedYear: org.founded_year ?? 0,
          industry: org.industry ?? '',
          employeeCount: org.estimated_num_employees ?? 0,
          annualRevenue: org.annual_revenue_printed ?? '',
          totalFunding: org.total_funding_printed ?? '',
          latestFundingStage: org.latest_funding_stage ?? '',
          latestFundingDate: org.latest_funding_round_date ?? '',
          fundingRounds: (org.funding_events ?? []).map((e: any) => ({
            date: e.date ?? '',
            type: e.type ?? '',
            investors: e.investors ?? '',
            amount: e.amount ?? '',
            currency: e.currency ?? '$',
          })),
          techStack: org.technology_names ?? [],
          departmentalHeadcount: org.departmental_head_count ?? {},
          linkedinUrl: org.linkedin_url ?? undefined,
          twitterUrl: org.twitter_url ?? undefined,
          city: org.city ?? undefined,
          state: org.state ?? undefined,
          country: org.country ?? undefined,
          shortDescription: org.short_description ?? undefined,
          keywords: org.keywords ?? undefined,
        };
      }
    } catch {
      // Apollo failures are non-fatal — continue without org enrichment
    }
  };

  // Node 8: NimbleWay News Search
  const node8Thunk = async () => {
    if (!process.env.NIMBLE_API_KEY) return;
    try {
      const nimbleNewsResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            query: `${companyNameForSearch} latest news funding`,
            focus: 'news',
            max_results: 5,
            deep_search: false,
            include_answer: true,
            time_range: 'year',
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      if (nimbleNewsResult.success) {
        ctx.storeNodeOutput('newsSearch', nimbleNewsResult.output);
        const newsBody = nimbleNewsResult.output as any;
        newsAiSummary = newsBody?.body?.answer ?? '';
        const rawResults: any[] = newsBody?.body?.results ?? [];
        newsResults = rawResults.map((r: any): NewsResult => ({
          title: r.title ?? '',
          url: r.url ?? '',
          description: r.description ?? '',
          publishedDate: r.metadata?.published_date,
        }));
      }
    } catch {
      // Non-fatal — continue without news data
    }
  };

  // Node 9.5: NimbleWay Moat/Competitive Intelligence (internally parallel)
  const node9_5Thunk = async () => {
    if (!process.env.NIMBLE_API_KEY) return;
    const nimbleHeaders = {
      'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const [competitorSearchResult, moatSearchResult] = await Promise.allSettled([
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            query: `${companyNameForSearch} competitors alternatives market landscape`,
            focus: 'general',
            max_results: 5,
            deep_search: true,
            include_answer: true,
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            query: `why can't big companies replicate ${companyNameForSearch} moat defensibility`,
            focus: 'general',
            max_results: 5,
            deep_search: false,
            include_answer: true,
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
    ]);
    if (competitorSearchResult.status === 'fulfilled' && competitorSearchResult.value.success) {
      ctx.storeNodeOutput('competitorSearch', competitorSearchResult.value.output);
      const cb = competitorSearchResult.value.output as any;
      competitorAiSummary = cb?.body?.answer ?? '';
      const rawCompResults: any[] = cb?.body?.results ?? [];
      competitorResults = rawCompResults.map((r: any) => ({
        title: r.title ?? '',
        description: r.description ?? '',
      }));
    }
    if (moatSearchResult.status === 'fulfilled' && moatSearchResult.value.success) {
      ctx.storeNodeOutput('moatSearch', moatSearchResult.value.output);
      moatAiSummary = (moatSearchResult.value.output as any)?.body?.answer ?? '';
    }
  };

  // Node 9.75: Perplexity Sonar — Founding Team Deep Research
  const node9_75Thunk = async () => {
    if (!process.env.PERPLEXITY_API_KEY) return;
    try {
      const perplexityBody = {
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a venture capital research assistant. Provide detailed, factual information about company founders and leadership teams. Include their educational backgrounds, previous companies, notable achievements, and any exits or funding history. Always cite your sources.',
          },
          {
            role: 'user',
            content: `Who founded ${companyNameForSearch} (${companyUrl})? Give me detailed backgrounds on each founder and key executive including: their full name, title, educational background, previous companies they worked at or founded, any notable achievements, previous exits or fundraises, and their LinkedIn URL if findable. Also mention the company's founding story if available.`,
          },
        ],
      };
      let perplexityTeamResult = await httpExecutor(
        {
          url: 'https://api.perplexity.ai/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: perplexityBody,
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      // Retry once on 429
      if (perplexityTeamResult.success && (perplexityTeamResult.output as any)?.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        perplexityTeamResult = await httpExecutor(
          {
            url: 'https://api.perplexity.ai/chat/completions',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: perplexityBody,
            timeout: 30000,
          },
          ctx.toNodeContext('user', 'research-wf')
        );
      }
      if (perplexityTeamResult.success) {
        ctx.storeNodeOutput('perplexityTeam', perplexityTeamResult.output);
        const pBody = perplexityTeamResult.output as any;
        perplexityTeamResearch = pBody?.body?.choices?.[0]?.message?.content ?? null;
        perplexityTeamCitations = pBody?.body?.citations ?? [];
      }
    } catch {
      // Non-fatal — continue without Perplexity team research
    }
  };

  // Node 9A: NimbleWay competitor search (first step of competitor discovery)
  const node9AThunk = async () => {
    if (!process.env.NIMBLE_API_KEY || !process.env.APOLLO_API_KEY) return;
    try {
      const competitorSearchResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            query: `${companyNameForSearch} top competitors alternatives`,
            focus: 'general',
            max_results: 5,
            deep_search: false,
            include_answer: true,
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      if (competitorSearchResult.success) {
        const searchBody = competitorSearchResult.output as any;
        node9ASearchAnswer =
          searchBody?.body?.answer ||
          JSON.stringify((searchBody?.body?.results || []).slice(0, 3)) ||
          null;
      }
    } catch {
      // Non-fatal — competitor discovery will be skipped
    }
  };

  // Run all Batch A nodes simultaneously
  await Promise.allSettled([
    node2Thunk(),
    node3Thunk(),
    node3_5Thunk(),
    node4Thunk(),
    node8Thunk(),
    node9_5Thunk(),
    node9_75Thunk(),
    node9AThunk(),
  ]);

  onProgress?.({ type: 'ai_insights', data: { chatgptSays, perplexitySays } });

  // ============================================
  // BATCH B: 4 nodes that depend on Batch A results
  // Nodes 5, 6, 7 (need apolloOrgId from Node 4), 9B (needs node9ASearchAnswer)
  // ============================================

  // Node 5: Apollo News Articles
  const node5Thunk = async () => {
    if (!apolloOrgId || !process.env.APOLLO_API_KEY) return;
    try {
      const apolloNewsResult = await httpExecutor(
        {
          url: 'https://api.apollo.io/api/v1/news_articles/search',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          body: {
            organization_ids: [apolloOrgId],
            per_page: 10,
            page: 1,
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      ctx.storeNodeOutput('newsArticles', apolloNewsResult.success ? apolloNewsResult.output : null);
      if (apolloNewsResult.success) {
        const newsBody = apolloNewsResult.output as any;
        const rawArticles: any[] = newsBody?.body?.news_articles || [];
        apolloNewsArticles = rawArticles.map((a) => ({
          title: a.title || '',
          url: a.url || '',
          source: a.domain || '',
          snippet: a.snippet || '',
          publishedAt: a.published_at || '',
          categories: a.event_categories || [],
        }));
      }
    } catch {
      // Non-fatal — continue without news articles
    }
  };

  // Node 6: Apollo Job Postings
  const node6Thunk = async () => {
    if (!apolloOrgId || !process.env.APOLLO_API_KEY) return;
    try {
      const jobPostingsResult = await httpExecutor(
        {
          url: `https://api.apollo.io/api/v1/organizations/${apolloOrgId}/job_postings?per_page=10`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      ctx.storeNodeOutput('jobPostings', jobPostingsResult.success ? jobPostingsResult.output : null);
      if (jobPostingsResult.success) {
        const jobBody = jobPostingsResult.output as any;
        const rawPostings: any[] = jobBody?.body?.organization_job_postings ?? [];
        jobPostings = rawPostings.map((j) => ({
          title: j.title,
          url: j.url,
          country: j.country ?? undefined,
          postedAt: j.posted_at,
        }));
      }
    } catch {
      // Non-fatal — continue without job postings
    }
  };

  // Node 7: Apollo People Search — leadership + alumni (internally parallel)
  const node7Thunk = async () => {
    if (!process.env.APOLLO_API_KEY) return;
    try {
      const peopleDomain = new URL(companyUrl).hostname.replace(/^www\./, '');
      const apolloPeopleHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      };
      const [leadershipResult, alumniResult] = await Promise.allSettled([
        httpExecutor(
          {
            url: 'https://api.apollo.io/api/v1/mixed_people/search',
            method: 'POST',
            headers: apolloPeopleHeaders,
            body: {
              api_key: process.env.APOLLO_API_KEY,
              q_organization_domains: [peopleDomain],
              person_titles: ['CEO', 'CTO', 'Founder', 'Co-Founder', 'VP', 'Director', 'Head of'],
              per_page: 10,
            },
            timeout: 30000,
          },
          ctx.toNodeContext('user', 'research-wf')
        ),
        httpExecutor(
          {
            url: 'https://api.apollo.io/api/v1/mixed_people/search',
            method: 'POST',
            headers: apolloPeopleHeaders,
            body: {
              api_key: process.env.APOLLO_API_KEY,
              q_organization_domains: [peopleDomain],
              person_titles: ['Former', 'Ex-'],
              per_page: 5,
            },
            timeout: 30000,
          },
          ctx.toNodeContext('user', 'research-wf')
        ),
      ]);
      if (leadershipResult.status === 'fulfilled' && leadershipResult.value.success) {
        ctx.storeNodeOutput('companyLeadership', leadershipResult.value.output);
        companyLeadership = mapApolloPersons((leadershipResult.value.output as any)?.body?.people);
      }
      if (alumniResult.status === 'fulfilled' && alumniResult.value.success) {
        ctx.storeNodeOutput('companyAlumni', alumniResult.value.output);
        companyAlumni = mapApolloPersons((alumniResult.value.output as any)?.body?.people);
      }
    } catch {
      // People search failure is non-fatal — continue without network data
    }
  };

  // Node 9B: Claude domain extraction from Node 9A search results
  const node9BThunk = async () => {
    if (!node9ASearchAnswer || !process.env.ANTHROPIC_API_KEY) return;
    try {
      const domainExtractionResult = await httpExecutor(
        {
          url: 'https://api.anthropic.com/v1/messages',
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [
              {
                role: 'user',
                content: `Task: Extract the domain names of the top 3 direct competitors to ${companyNameForSearch} from the search results below.\n\nRules:\n1. Return ONLY a JSON array of domain strings — no markdown, no explanation, no backticks\n2. Use root domains only (e.g., "competitor.com" not "www.competitor.com" or "competitor.com/pricing")\n3. Do NOT include the target company's own domain (${companyNameForSearch} itself)\n4. Only include companies that are clearly direct competitors — same buyer, same problem, overlapping product category\n5. If fewer than 3 clear direct competitors can be identified, return only the ones you are confident about (minimum 1, do not invent companies to reach 3)\n6. Do not include aggregators, review sites (G2, Capterra), or news sites — only actual competitor companies\n\nOutput format: ["domain1.com", "domain2.com", "domain3.com"]\n\nSearch results:\n${node9ASearchAnswer}`,
              },
            ],
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );
      if (domainExtractionResult.success) {
        const domainText: string = (domainExtractionResult.output as any)?.body?.content?.[0]?.text ?? '';
        try {
          const domains: string[] = JSON.parse(domainText.replace(/```json\n?|```\n?/g, '').trim());
          if (Array.isArray(domains) && domains.length > 0) {
            node9BDomains = domains.slice(0, 3);
          }
        } catch {
          // Domain parsing failed — skip competitor enrichment
        }
      }
    } catch {
      // Non-fatal — continue without competitor comparison
    }
  };

  // Run all Batch B nodes simultaneously
  await Promise.allSettled([
    node5Thunk(),
    node6Thunk(),
    node7Thunk(),
    node9BThunk(),
  ]);

  onProgress?.({ type: 'enrichment', data: { orgEnrichment, apolloNewsArticles, jobPostings, totalJobPostings: jobPostings.length, newsResults, newsAiSummary } });
  onProgress?.({ type: 'people', data: { companyLeadership, companyAlumni } });

  // ============================================
  // NODE 9C: Apollo org enrichment for competitor domains (parallel, max 3)
  // ============================================
  if (node9BDomains.length > 0 && process.env.APOLLO_API_KEY) {
    try {
      const enrichResults = await Promise.allSettled(
        node9BDomains.map((domain) =>
          httpExecutor(
            {
              url: `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': process.env.APOLLO_API_KEY!,
              },
              timeout: 15000,
            },
            ctx.toNodeContext('user', 'research-wf')
          )
        )
      );

      ctx.storeNodeOutput('competitors', enrichResults);

      competitorData = enrichResults
        .map((result, i) => {
          if (result.status !== 'fulfilled' || !result.value.success) return null;
          const o = (result.value.output as any)?.body?.organization;
          if (!o) return null;
          return {
            name: o.name || node9BDomains[i],
            domain: o.primary_domain || node9BDomains[i],
            employeeCount: o.estimated_num_employees || 0,
            annualRevenue: o.annual_revenue_printed || String(o.annual_revenue || 'N/A'),
            totalFunding: o.total_funding_printed || String(o.total_funding || 'N/A'),
            latestFundingStage: o.latest_funding_stage || 'N/A',
            foundedYear: o.founded_year || 0,
            industry: o.industry || 'N/A',
          } satisfies CompetitorComparison;
        })
        .filter((c): c is CompetitorComparison => c !== null);
    } catch {
      // Competitor enrichment is non-fatal — continue without comparison data
    }
  }

  onProgress?.({ type: 'competitors', data: { competitorData, moatAiSummary: moatAiSummary || undefined } });

  // ============================================
  // NODE 10: Analyze with Claude via Anthropic API
  // ============================================
  const analysisResult = await httpExecutor(
    {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: RESEARCH_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(markdown, companyUrl, googleSerpMarkdown, chatgptSays, perplexitySays, apolloNewsArticles, orgEnrichment, jobPostings, jobPostings.length, newsAiSummary, newsResults, companyLeadership, companyAlumni, competitorData, competitorAiSummary, competitorResults, moatAiSummary, aboutPageMarkdown, founderSearchSummary, perplexityTeamResearch, perplexityTeamCitations),
          },
        ],
      },
      timeout: 120000,
    },
    ctx.toNodeContext('user', 'research-wf')
  );

  if (!analysisResult.success) {
    return { success: false, error: `Analysis failed: ${analysisResult.error}` };
  }

  // Store analysis output in context
  ctx.storeNodeOutput('analysis', analysisResult.output);

  // Parse Claude's JSON response
  const analysisBody = analysisResult.output as any;
  const responseText = analysisBody?.body?.content?.[0]?.text;

  if (!responseText) {
    return { success: false, error: 'Claude returned an empty response.' };
  }

  try {
    // Strip any accidental markdown backticks Claude might add
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const brief: ResearchBrief = {
      companyName: parsed.companyName || 'Unknown',
      companyUrl: companyUrl,
      scrapedAt: new Date().toISOString(),
      sections: {
        companyOverview: parsed.sections?.companyOverview || 'Not available',
        foundingTeam: parsed.sections?.foundingTeam || 'Not available',
        product: parsed.sections?.product || 'Not available',
        targetMarket: parsed.sections?.targetMarket || 'Not available',
        competitiveLandscape: parsed.sections?.competitiveLandscape || 'Not available',
        redFlags: parsed.sections?.redFlags || 'Not available',
        glasswingRelevance: parsed.sections?.glasswingRelevance || 'Not available',
        searchPresence: parsed.sections?.searchPresence || 'Not available',
        aiConsensus: parsed.sections?.aiConsensus || 'Not available',
        recentEvents: parsed.sections?.recentEvents || 'Not available',
        newsAndPress: parsed.sections?.newsAndPress || 'Not available',
        hiringSignal: parsed.sections?.hiringSignal || 'Not available',
        fundingAnalysis: parsed.sections?.fundingAnalysis || 'Not available',
        techStackAnalysis: parsed.sections?.techStackAnalysis || 'Not available',
        networkOpportunity: parsed.sections?.networkOpportunity || 'Not available',
        competitorComparison: parsed.sections?.competitorComparison || 'Not available',
        competitiveMoat: parsed.sections?.competitiveMoat || 'Not available',
        founderDeepDive: parsed.sections?.founderDeepDive || 'Not available',
      },
      metadata: {
        pageTitle: metadata.title || '',
        pageDescription: metadata.description || '',
        sourceUrl: metadata.sourceURL || companyUrl,
      },
      chatgptSays,
      perplexitySays,
      apolloNewsArticles,
      jobPostings,
      totalJobPostings: jobPostings.length,
      newsResults,
      newsAiSummary,
      companyLeadership,
      companyAlumni,
      orgEnrichment,
      competitorData,
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : undefined,
      moatAiSummary: moatAiSummary || undefined,
      perplexityTeamResearch: perplexityTeamResearch ?? undefined,
      perplexityTeamCitations: perplexityTeamCitations.length > 0 ? perplexityTeamCitations : undefined,
    };

    onProgress?.({ type: 'analysis', data: { sections: brief.sections } });

    return { success: true, brief };
  } catch (parseError) {
    return { success: false, error: `Failed to parse Claude response as JSON: ${responseText.slice(0, 200)}` };
  }
}
