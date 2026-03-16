'use client';
import { useState, useEffect } from 'react';
import SearchForm from '@/components/SearchForm';
import LoadingState from '@/components/LoadingState';
import ResearchBriefComponent from '@/components/ResearchBrief';
import BriefChat from '@/components/BriefChat';
import InvestmentMemo from '@/components/InvestmentMemo';
import BriefSidebar from '@/components/BriefSidebar';
import type { ResearchBrief, ResearchResponse, MemoResponse } from '@/lib/types';

type PageState = 'idle' | 'loading' | 'done' | 'memo';

export default function Home() {
  const [state, setState] = useState<PageState>('idle');
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<string | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);

  const [activeSectionId, setActiveSectionId] = useState('section-overview');
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (state !== 'done') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    const elements = document.querySelectorAll('[id^="section-"]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [state, brief]);

  const handleSectionClick = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGenerateMemo = async () => {
    if (!brief) return;
    setMemoLoading(true);
    setMemoError(null);
    try {
      const res = await fetch('/api/memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });
      const data = await res.json() as MemoResponse;
      if (!data.success || !data.memo) {
        setMemoError(data.error ?? 'Failed to generate memo');
        return;
      }
      setMemo(data.memo);
      setMemoError(null);
      setState('memo');
    } catch (err) {
      setMemoError(err instanceof Error ? err.message : 'Failed to generate memo');
    } finally {
      setMemoLoading(false);
    }
  };

  async function handleSubmit(url: string) {
    setState('loading');
    setActiveUrl(url);
    setError(null);
    setMemoError(null);
    setBrief(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ResearchResponse = await res.json();

      if (data.success && data.brief) {
        setBrief(data.brief);
        setState('done');
      } else {
        setError(data.error ?? 'An unknown error occurred.');
        setState('idle');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setState('idle');
    }
  }

  if (state === 'done' && brief) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row' }}>
        <BriefSidebar
          companyName={brief.companyName}
          activeSectionId={activeSectionId}
          onSectionClick={handleSectionClick}
          onGenerateMemo={handleGenerateMemo}
          onNewSearch={handleSubmit}
          memoLoading={memoLoading}
        />
        <main style={{ flex: 1, padding: '4rem 2rem', overflowY: 'auto' }}>
          <div className="max-w-2xl mx-auto">
            {memoError && (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'rgba(255,79,79,0.08)',
                  border: '1px solid rgba(255,79,79,0.2)',
                  color: 'var(--accent-red)',
                  fontFamily: 'var(--font-ibm-sans)',
                }}
              >
                Memo generation failed: {memoError}
              </div>
            )}
            <ResearchBriefComponent brief={brief} onGenerateMemo={handleGenerateMemo} />
          </div>
        </main>
        
        <BriefChat brief={brief} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        
        {/* Floating chat button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="chat-float-btn"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '2rem',
              padding: '12px 20px',
              fontFamily: 'var(--font-jetbrains)',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          >
            💬 Ask
          </button>
        )}

        {/* Memo loading overlay */}
        {memoLoading && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(10,10,14,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <p
              className="text-sm animate-pulse"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
            >
              Drafting memo...
            </p>
          </div>
        )}
      </div>
    );
  }

  if (state === 'memo' && memo) {
    return (
      <main className="min-h-screen py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <InvestmentMemo memo={memo} onBack={() => setState('done')} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
            >
              Glasswing Ventures
            </span>
          </div>
          <h1
            className="text-3xl font-medium mb-2"
            style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
          >
            Deal Research
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
          >
            Paste a company URL to generate an AI-powered research brief.
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-6">
          <SearchForm onSubmit={handleSubmit} isLoading={state === 'loading'} />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,79,79,0.08)',
              border: '1px solid rgba(255,79,79,0.2)',
              color: 'var(--accent-red)',
              fontFamily: 'var(--font-ibm-sans)',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading State */}
        {state === 'loading' && <LoadingState url={activeUrl} />}
      </div>
    </main>
  );
}
