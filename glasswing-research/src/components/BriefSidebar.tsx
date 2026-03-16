'use client';
import { FormEvent, useState } from 'react';

interface BriefSidebarProps {
  companyName: string;
  activeSectionId: string;
  onSectionClick: (id: string) => void;
  onGenerateMemo: () => void;
  onNewSearch: (url: string) => void;
  memoLoading: boolean;
}

const GROUPS = [
  {
    title: 'Core',
    items: [
      { id: 'section-overview', label: 'Overview' },
      { id: 'section-team', label: 'Team' },
      { id: 'section-product', label: 'Product' },
      { id: 'section-market', label: 'Market' },
      { id: 'section-competitive', label: 'Competitive' },
      { id: 'section-moat', label: 'Moat' },
      { id: 'section-red-flags', label: 'Red Flags' },
      { id: 'section-glasswing', label: 'Glasswing Fit' },
    ]
  },
  {
    title: 'Data',
    items: [
      { id: 'section-competitor-table', label: 'Competitor Table' },
      { id: 'section-funding', label: 'Funding' },
      { id: 'section-tech', label: 'Tech Stack' },
      { id: 'section-headcount', label: 'Headcount' },
    ]
  },
  {
    title: 'Network',
    items: [
      { id: 'section-leadership', label: 'Leadership' },
      { id: 'section-alumni', label: 'Alumni' },
      { id: 'section-hiring', label: 'Hiring Signals' },
      { id: 'section-jobs', label: 'Job Postings' },
    ]
  },
  {
    title: 'Intel',
    items: [
      { id: 'section-news', label: 'News Feed' },
      { id: 'section-ai-synthesis', label: 'AI Synthesis' },
    ]
  }
];

export default function BriefSidebar({
  companyName,
  activeSectionId,
  onSectionClick,
  onGenerateMemo,
  onNewSearch,
  memoLoading,
}: BriefSidebarProps) {
  const [newUrl, setNewUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newUrl.trim()) {
      onNewSearch(newUrl.trim());
      setNewUrl('');
    }
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '220px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '1.5rem 1rem 1rem' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-jetbrains)', marginBottom: '4px' }}>
          Glasswing Research
        </div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains)', marginBottom: '16px', wordBreak: 'break-word', lineHeight: 1.2 }}>
          {companyName}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="New search URL..."
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ibm-sans)',
              outline: 'none',
            }}
          />
        </form>
      </div>

      {/* Nav Groups */}
      <div style={{ flex: 1, padding: '0 0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div style={{ padding: '0 0.5rem', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>
              {group.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map(item => {
                const isActive = activeSectionId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionClick(item.id)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-ibm-sans)',
                      borderRadius: '4px',
                      background: 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', position: 'sticky', bottom: 0, background: 'var(--bg)' }}>
        <button
          onClick={onGenerateMemo}
          disabled={memoLoading}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 0',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-jetbrains)',
            cursor: memoLoading ? 'not-allowed' : 'pointer',
            opacity: memoLoading ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {memoLoading ? 'Drafting...' : 'Generate Memo →'}
        </button>
      </div>
    </div>
  );
}
