'use client';
import type { ResearchBrief } from '@/lib/types';

interface Props {
  brief: ResearchBrief;
  onGenerateMemo: () => void;
  memoLoading: boolean;
  onAsk: () => void;
  onNewSearch: () => void;
}

export default function CompanyHeader({
  brief,
  onGenerateMemo,
  memoLoading,
  onAsk,
  onNewSearch,
}: Props) {
  const org = brief.orgEnrichment;

  return (
    <div
      className="rounded-xl px-5 py-4 mb-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Row 1: name + CTAs */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="min-w-0">
          <h2
            className="text-xl font-medium truncate"
            style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
          >
            {brief.companyName}
          </h2>
          {brief.metadata?.pageDescription && (
            <p
              className="text-xs mt-0.5 line-clamp-1"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
            >
              {brief.metadata.pageDescription}
            </p>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAsk}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-jetbrains)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Ask
          </button>
          <button
            onClick={onGenerateMemo}
            disabled={memoLoading}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              color: '#fff',
              fontFamily: 'var(--font-jetbrains)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: memoLoading ? 'default' : 'pointer',
              opacity: memoLoading ? 0.7 : 1,
            }}
          >
            {memoLoading ? 'Drafting...' : 'Memo →'}
          </button>
        </div>
      </div>

      {/* Row 2: metrics + URL */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Clickable URL */}
        <button
          onClick={onNewSearch}
          className="text-[11px] hover:underline"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontFamily: 'var(--font-ibm-mono)',
            cursor: 'pointer',
            padding: 0,
          }}
          title="Start new search"
        >
          {brief.companyUrl}
        </button>

        {org && (
          <>
            <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
            {org.latestFundingStage && (
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{org.latestFundingStage}</span>
            )}
            {org.employeeCount > 0 && (
              <>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{org.employeeCount.toLocaleString()} employees</span>
              </>
            )}
            {org.foundedYear > 0 && (
              <>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>est. {org.foundedYear}</span>
              </>
            )}
          </>
        )}
      </div>


    </div>
  );
}
