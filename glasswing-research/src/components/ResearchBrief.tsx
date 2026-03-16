import type { ResearchBrief as ResearchBriefType } from '@/lib/types';
import CommandCenter from './CommandCenter';
import CompanyHeader from './CommandCenter/CompanyHeader';
import BriefSection from './BriefSection';

interface Props {
  brief: ResearchBriefType;
  onGenerateMemo: () => void;
  memoLoading: boolean;
  memoError?: string | null;
  onAsk: () => void;
  onNewSearch: () => void;
  isStreaming?: boolean;
}

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded"
          style={{ height: '12px', width: i === lines - 1 ? '60%' : '100%', background: 'var(--border)' }}
        />
      ))}
    </div>
  );
}

export default function ResearchBrief({
  brief,
  onGenerateMemo,
  memoLoading,
  memoError,
  onAsk,
  onNewSearch,
  isStreaming,
}: Props) {
  const s = (brief.sections ?? {}) as ResearchBriefType['sections'];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Company header bar */}
      <CompanyHeader
        brief={brief}
        onGenerateMemo={onGenerateMemo}
        memoLoading={memoLoading}
        memoError={memoError}
        onAsk={onAsk}
        onNewSearch={onNewSearch}
      />

      {/* Command center: tile grid + push panel */}
      <CommandCenter brief={brief} isStreaming={isStreaming ?? false} />

      {/* Company overview — always visible below grid */}
      <div>
        {isStreaming && !s.companyOverview ? (
          <BriefSection title="Company Overview" content="" icon="◈">
            <SkeletonBlock />
          </BriefSection>
        ) : (
          <BriefSection title="Company Overview" content={s.companyOverview || ''} icon="◈" />
        )}
      </div>

      {/* Competitor table — below grid, only when data exists */}
      {brief.competitorData && brief.competitorData.length > 0 && (
        <BriefSection title="Competitor Comparison" content={s.competitorComparison || ''} icon="◈">
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-[11px] border-collapse" style={{ fontFamily: 'var(--font-ibm-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Company', 'Employees', 'Funding', 'Revenue', 'Stage', 'Founded'].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 pr-4 uppercase tracking-widest font-normal"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)', fontSize: '9px' }}
                    >
                      {h}
                    </th>
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
                {brief.competitorData.map((c, i) => (
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
        </BriefSection>
      )}
    </div>
  );
}
