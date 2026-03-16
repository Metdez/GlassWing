import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { MemoResponse, ResearchBrief } from '@/lib/types';

export const maxDuration = 60;

// Brief is intentionally permissive — full ResearchBrief validation would duplicate the schema
const requestSchema = z.object({
  brief: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request): Promise<NextResponse<MemoResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Missing brief in request body' }, { status: 400 });
  }

  const brief = parsed.data.brief as unknown as ResearchBrief;
  const companyName = brief.companyName ?? 'the company';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Build a bounded research summary instead of serializing the full brief object.
  // Raw brief objects can exceed 50k chars once Apollo articles and AI responses are included.
  const researchSummary = JSON.stringify({
    companyName: brief.companyName,
    companyUrl: brief.companyUrl,
    sections: brief.sections,
    orgEnrichment: brief.orgEnrichment,
    apolloNewsArticles: (brief.apolloNewsArticles ?? []).slice(0, 10),
    chatgptSays: brief.chatgptSays?.slice(0, 1500),
    perplexitySays: brief.perplexitySays?.slice(0, 1500),
  });

  const userContent = `Write an IC-ready investment memo for ${companyName} using only the data in the research brief below. Do not add information not present in the research.

RESEARCH DATA:
${researchSummary}

---

Format the memo exactly as follows:

**EXECUTIVE SUMMARY**
2–3 sentences. State: what they do, for whom, and why it matters now. End with one sentence on the investment thesis in plain language.

**COMPANY OVERVIEW**
Product description (what it is technically), delivery model, business model/pricing if known, current stage evidence (revenue range, employee count, last funding). Label estimates as estimates.

**TEAM**
For each key person: name, role, one sentence of relevant background. Assess overall team quality: technical depth, domain expertise, prior startup experience, GTM capability. Flag any gaps (e.g., "no enterprise sales leader yet").

**MARKET OPPORTUNITY**
State the TAM with a source or rationale. Identify the beachhead ICP. Explain the market timing argument — why is this the right moment? Flag if the TAM claim appears unsubstantiated.

**COMPETITIVE LANDSCAPE**
Name 3–5 important competitors. State the target company's primary differentiation in one sentence each. Assess the moat type and durability. Note the largest competitive threat.

**TRACTION & METRICS**
Report all available hard data: funding raised, stage, employee count, revenue range, job posting velocity, press coverage cadence. For unavailable metrics: "[OPEN QUESTION: confirm X via data room]". Do not estimate revenue without a source.

**KEY RISKS**
3–5 specific risks as bullet points. For each: the risk, the evidence for it, and what would mitigate it. No generic risks without specifics — be direct.

**GLASSWING FIT**
Score: STRONG / MODERATE / WEAK. Explain: (1) which thesis area, (2) specific portfolio companies that create synergy, (3) value-add beyond capital, (4) stage/check alignment. If fit is weak, say why clearly.

**RECOMMENDATION**
Choose exactly one: PROCEED TO PARTNER MEETING / PASS / CONDITIONAL PROCEED (state the specific condition).
Follow with 2–3 sentences of rationale anchored to specific evidence. Then list 1–3 key diligence questions for the partner meeting if proceeding.`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system:
          `You are a senior associate at Glasswing Ventures preparing an IC-ready investment memo.

ABOUT THE READER: This memo will be read by a Glasswing general partner who has 15 minutes before an investment committee discussion. They are expert in AI/ML enterprise, cybersecurity, and deep tech. They do not need background on the AI market — they need a crisp, evidence-based argument for or against taking a partner meeting with this company.

GLASSWING INVESTMENT CRITERIA: Seed to Series B. AI-native or AI-enabled enterprise software. Core focus: AI/ML infrastructure, enterprise cybersecurity, intelligent automation, deep tech IP. Check size $1M–$5M. Pass criteria: consumer, pure SaaS without AI differentiation, crypto/Web3, hardware.

WRITING STANDARDS:
- IC-ready means: every claim backed by a data point, no filler sentences, no marketing language echoed from the website
- When data is missing, label it "[OPEN QUESTION: what research would answer this]"
- The recommendation must state a clear action (proceed / pass / conditional) with a one-sentence rationale
- Length target: 600–900 words total
- Use bold section headers exactly as specified in the user message
- Do not pad sections where data is thin — shorter is better than vague`,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error calling Anthropic API';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json(
      { success: false, error: `Anthropic API error ${response.status}: ${text}` },
      { status: 502 }
    );
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const memo = data.content?.find((c) => c.type === 'text')?.text ?? '';

  if (!memo) {
    return NextResponse.json({ success: false, error: 'Empty response from Anthropic' }, { status: 502 });
  }

  return NextResponse.json({ success: true, memo });
}