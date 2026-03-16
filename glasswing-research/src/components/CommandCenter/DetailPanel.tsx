'use client';
import React from 'react';
import type { ResearchBrief, NewsArticle } from '@/lib/types';
import BriefSection from '@/components/BriefSection';
import type { TileId } from './index';

interface Props {
  tileId: TileId;
  brief: ResearchBrief;
  onClose: () => void;
}

// ─── Reusable sub-renderers ─────────────────────────────────────────────────

function PersonList({ people, title }: { people: ResearchBrief['companyLeadership']; title: string }) {
  if (!people?.length) return null;
  return (
    <details
      className="rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <summary
        className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
      >
        ▸ {title} ({people.length})
      </summary>
      <ul className="px-5 pb-4 flex flex-col gap-2">
        {people.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-ibm-sans)' }}>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
            <span style={{ color: 'var(--text-secondary)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)' }}>{p.title}{p.company ? ` at ${p.company}` : ''}</span>
            {p.location && (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>·</span>
                <span style={{ color: 'var(--text-secondary)' }}>{p.location}</span>
              </>
            )}
            {p.linkedinUrl && (
              <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function NewsTimeline({ articles }: { articles: NewsArticle[] }) {
  const categoryColors: Record<string, string> = {
    hires: 'var(--accent-blue)',
    investment: 'var(--accent-green)',
    contract: '#f59e0b',
    partnership: '#a78bfa',
    product_launch: 'var(--accent-green)',
    expansion: 'var(--accent-blue)',
    acquisition: '#f97316',
  };
  return (
    <div className="flex flex-col gap-3">
      {articles.map((article, i) => {
        const color = article.categories[0]
          ? (categoryColors[article.categories[0]] ?? 'var(--text-secondary)')
          : 'var(--text-secondary)';
        const date = article.publishedAt
          ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : '—';
        return (
          <div key={i} className="flex items-start gap-3">
            <span className="shrink-0 text-[10px] w-16 pt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
              {date}
            </span>
            {article.categories[0] && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border" style={{ color, borderColor: color, fontFamily: 'var(--font-jetbrains)' }}>
                {article.categories[0].replace('_', ' ')}
              </span>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs leading-snug hover:underline" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>
                {article.title}
              </a>
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{article.source}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobPostingsList({ brief }: { brief: ResearchBrief }) {
  const jobs = brief.jobPostings;
  if (!jobs?.length) return null;
  const eng = ['engineer','developer','dev','architect','sre','devops','backend','frontend','fullstack','software','data','ml','ai'];
  const sales = ['sales','account','ae','sdr','bdr','revenue','business development','customer success'];
  const lead = ['vp','vice president','director','head of','chief','cto','ceo','coo','cfo','president'];
  const categorize = (title: string) => {
    const t = title.toLowerCase();
    if (lead.some(k => t.includes(k))) return 'Leadership';
    if (eng.some(k => t.includes(k))) return 'Engineering';
    if (sales.some(k => t.includes(k))) return 'Sales';
    return 'Other';
  };
  const groups: Record<string, number> = {};
  jobs.forEach(j => { const c = categorize(j.title); groups[c] = (groups[c] || 0) + 1; });
  const summary = ['Engineering','Sales','Leadership','Other'].filter(g => groups[g]).map(g => `${groups[g]} ${g}`).join(' · ');
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">◈</span>
        <h3 className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}>Active Job Postings</h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)' }}>{brief.totalJobPostings}</span>
      </div>
      <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{summary}</p>
      <ul className="flex flex-col gap-1.5">
        {jobs.map((job, i) => (
          <li key={i} className="flex items-baseline gap-2 text-xs">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:underline leading-snug" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{job.title}</a>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)', fontSize: '10px', flexShrink: 0 }}>{job.country || 'Remote'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tile content renderers ──────────────────────────────────────────────────

function TeamContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Founding Team" content={s.foundingTeam || ''} icon="◈">
        {s.founderDeepDive && s.founderDeepDive !== 'Not available' && (
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Founder Profiles</span>
            {s.founderDeepDive.split(/\n+/).filter(Boolean).map((line, i) => (
              <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </div>
        )}
        {brief.perplexityTeamResearch && (
          <details className="mt-3 rounded" style={{ border: '1px solid var(--border)' }}>
            <summary className="px-3 py-2 cursor-pointer text-[10px] uppercase tracking-widest select-none" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>▸ Perplexity Source</summary>
            <pre className="px-3 pb-3 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{brief.perplexityTeamResearch}</pre>
          </details>
        )}
        {brief.perplexityTeamCitations && brief.perplexityTeamCitations.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Sources</span>
            <div className="flex flex-col gap-1">
              {brief.perplexityTeamCitations.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] hover:underline truncate" style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)' }}>{url}</a>
              ))}
            </div>
          </div>
        )}
      </BriefSection>
      <PersonList people={brief.companyLeadership} title="Current Leadership" />
    </div>
  );
}

function ProductContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Product" content={s.product || ''} icon="◈" />
      <BriefSection title="Tech Stack & Engineering" content={s.techStackAnalysis || ''} icon="◈">
        {brief.orgEnrichment?.techStack && brief.orgEnrichment.techStack.length > 0 && (
          <div className="mb-4">
            <span className="block text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Technology Stack</span>
            <div className="flex flex-wrap gap-1.5">
              {brief.orgEnrichment.techStack.map((tech, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{tech}</span>
              ))}
            </div>
          </div>
        )}
        {brief.orgEnrichment && Object.keys(brief.orgEnrichment.departmentalHeadcount).length > 0 && (() => {
          const entries = Object.entries(brief.orgEnrichment!.departmentalHeadcount).sort(([,a],[,b]) => b-a);
          const max = entries[0]?.[1] ?? 1;
          return (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Department Headcount</span>
              {entries.map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-2 text-[10px]">
                  <span className="w-28 shrink-0 capitalize" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{dept.replace(/_/g,' ')}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count/max)*100}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="w-8 text-right shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{count}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </BriefSection>
    </div>
  );
}

function MarketContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Target Market" content={s.targetMarket || ''} icon="◈" />
      <BriefSection title="Competitive Landscape" content={s.competitiveLandscape || ''} icon="◈" />
    </div>
  );
}

function CompetitorsContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  const hasTable = brief.competitorData && brief.competitorData.length > 0;
  const hasMoat = brief.moatAiSummary;
  const hasNeither = !hasTable && !hasMoat;

  if (hasNeither) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}>
        No competitor data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Competitor Comparison" content={s.competitorComparison || ''} icon="◈">
        {hasTable && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-[11px] border-collapse" style={{ fontFamily: 'var(--font-ibm-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Company','Employees','Funding','Revenue','Stage','Founded'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 uppercase tracking-widest font-normal" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)', fontSize: '9px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brief.orgEnrichment && (
                  <tr style={{ background: 'rgba(79,140,255,0.08)', borderBottom: '1px solid rgba(79,140,255,0.2)' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: 'var(--accent-blue)' }}>
                      {brief.companyName}
                      <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.15)', color: 'var(--accent-blue)' }}>you</span>
                    </td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.employeeCount > 0 ? brief.orgEnrichment.employeeCount.toLocaleString() : 'N/A'}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.totalFunding || 'N/A'}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.annualRevenue || 'N/A'}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.latestFundingStage || 'N/A'}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.foundedYear > 0 ? brief.orgEnrichment.foundedYear : 'N/A'}</td>
                  </tr>
                )}
                {brief.competitorData!.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.employeeCount > 0 ? c.employeeCount.toLocaleString() : 'N/A'}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.totalFunding}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.annualRevenue}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.latestFundingStage}</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.foundedYear > 0 ? c.foundedYear : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!hasTable && hasMoat && (
          <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}>
            <p>{brief.moatAiSummary}</p>
            <p className="mt-2 text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>No competitor table — Apollo key not configured.</p>
          </div>
        )}
      </BriefSection>
    </div>
  );
}

function FundingContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <BriefSection title="Funding & Financials" content={s.fundingAnalysis || ''} icon="◈" variant="positive">
      {brief.orgEnrichment && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {brief.orgEnrichment.employeeCount > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>{brief.orgEnrichment.employeeCount.toLocaleString()} employees</span>
            )}
            {brief.orgEnrichment.totalFunding && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontFamily: 'var(--font-ibm-mono)' }}>${brief.orgEnrichment.totalFunding} raised</span>
            )}
            {brief.orgEnrichment.latestFundingStage && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>{brief.orgEnrichment.latestFundingStage}</span>
            )}
            {brief.orgEnrichment.annualRevenue && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>${brief.orgEnrichment.annualRevenue} ARR</span>
            )}
            {brief.orgEnrichment.foundedYear > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>est. {brief.orgEnrichment.foundedYear}</span>
            )}
          </div>
          {brief.orgEnrichment.fundingRounds.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Funding History</span>
              {brief.orgEnrichment.fundingRounds.map((round, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="shrink-0 w-16 text-[10px] pt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
                    {round.date ? new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                  </span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)', fontFamily: 'var(--font-jetbrains)' }}>{round.type}</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{round.currency}{round.amount}</span>
                    {round.investors && <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}>{round.investors}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </BriefSection>
  );
}

function MoatContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Competitive Moat" content={s.competitiveMoat || ''} icon="⬡" variant="warning" />
      <BriefSection title="Search Presence" content={s.searchPresence || ''} icon="◈" />
    </div>
  );
}

function FlagsContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return <BriefSection title="Red Flags" content={s.redFlags || ''} icon="⚠" variant="warning" />;
}

function PeopleContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Hiring Signal" content={s.hiringSignal || ''} icon="◈" />
      <PersonList people={brief.companyLeadership} title="Current Leadership" />
      <PersonList people={brief.companyAlumni} title="Alumni Network" />
      <JobPostingsList brief={brief} />
    </div>
  );
}

function IntelContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="News & Press" content={s.newsAndPress || ''} icon="◈" />
      <BriefSection title="Recent Events" content={s.recentEvents || ''} icon="◈" />
      <BriefSection title="AI Platform Consensus" content={s.aiConsensus || ''} icon="◈" variant="positive" />
      {brief.newsAiSummary && (
        <BriefSection title="News AI Summary" content={brief.newsAiSummary} icon="◈" />
      )}
      {brief.apolloNewsArticles && brief.apolloNewsArticles.length > 0 && (
        <div className="rounded-xl px-5 py-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Apollo News Feed</span>
          <NewsTimeline articles={brief.apolloNewsArticles} />
        </div>
      )}
      {brief.chatgptSays && (
        <details className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <summary className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>▸ What ChatGPT says</summary>
          <pre className="px-5 pb-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{brief.chatgptSays}</pre>
        </details>
      )}
      {brief.perplexitySays && (
        <details className="rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <summary className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>▸ What Perplexity says</summary>
          <pre className="px-5 pb-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{brief.perplexitySays}</pre>
        </details>
      )}
    </div>
  );
}

function FitContent({ brief }: { brief: ResearchBrief }) {
  const s = brief.sections ?? ({} as ResearchBrief['sections']);
  return (
    <div className="flex flex-col gap-3">
      <BriefSection title="Glasswing Relevance" content={s.glasswingRelevance || ''} icon="◆" variant="positive" />
      <BriefSection title="Network & Warm Intros" content={s.networkOpportunity || ''} icon="◈" variant="positive" />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const PANEL_TITLES: Record<TileId, string> = {
  team: 'Founding Team',
  product: 'Product & Tech',
  market: 'Market & Competition',
  competitors: 'Competitor Comparison',
  funding: 'Funding & Financials',
  moat: 'Competitive Moat',
  flags: 'Red Flags',
  people: 'People & Hiring',
  intel: 'News & Intelligence',
  fit: 'Glasswing Fit',
};

export default function DetailPanel({ tileId, brief, onClose }: Props) {
  const contentMap: Record<TileId, React.ReactNode> = {
    team:        <TeamContent brief={brief} />,
    product:     <ProductContent brief={brief} />,
    market:      <MarketContent brief={brief} />,
    competitors: <CompetitorsContent brief={brief} />,
    funding:     <FundingContent brief={brief} />,
    moat:        <MoatContent brief={brief} />,
    flags:       <FlagsContent brief={brief} />,
    people:      <PeopleContent brief={brief} />,
    intel:       <IntelContent brief={brief} />,
    fit:         <FitContent brief={brief} />,
  };

  return (
    <div
      className="rounded-xl"
      style={{ background: 'var(--surface)', border: '1px solid var(--accent)', padding: '16px' }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
        >
          {PANEL_TITLES[tileId]}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: '0 4px',
          }}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>
      {/* Panel content */}
      {contentMap[tileId]}
    </div>
  );
}
