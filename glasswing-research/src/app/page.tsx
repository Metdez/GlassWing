'use client';
import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import LoadingState from '@/components/LoadingState';
import ResearchBriefComponent from '@/components/ResearchBrief';
import BriefChat from '@/components/BriefChat';
import InvestmentMemo from '@/components/InvestmentMemo';
import type { ResearchBrief, MemoResponse } from '@/lib/types';
import type { StreamEvent } from '@/lib/workflow';

type PageState = 'idle' | 'loading' | 'streaming' | 'done' | 'memo';

export default function Home() {
  const [state, setState] = useState<PageState>('idle');
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [partialBrief, setPartialBrief] = useState<Partial<ResearchBrief> | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState<string | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);

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
    setPartialBrief(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? 'An unknown error occurred.');
        setState('idle');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }

          if (event.type === 'init') {
            setPartialBrief({
              companyName: event.data.companyName,
              companyUrl: event.data.companyUrl,
              scrapedAt: event.data.scrapedAt,
              metadata: event.data.metadata,
              sections: {} as ResearchBrief['sections'],
            });
            setState('streaming');
          } else if (event.type === 'analysis') {
            setPartialBrief(prev => prev ? { ...prev, sections: event.data.sections } : prev);
          } else if (event.type === 'ai_insights') {
            setPartialBrief(prev => prev ? { ...prev, ...event.data } : prev);
          } else if (event.type === 'enrichment') {
            setPartialBrief(prev => prev ? { ...prev, ...event.data } : prev);
          } else if (event.type === 'people') {
            setPartialBrief(prev => prev ? { ...prev, ...event.data } : prev);
          } else if (event.type === 'competitors') {
            setPartialBrief(prev => prev ? { ...prev, ...event.data } : prev);
          } else if (event.type === 'done') {
            setBrief(event.data);
            setState('done');
          } else if (event.type === 'error') {
            setError(event.data.error);
            setState('idle');
          }
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setState('idle');
    }
  }

  const activeBrief = brief ?? (partialBrief as ResearchBrief | null);

  if ((state === 'done' || state === 'streaming') && activeBrief) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <main style={{ padding: '2rem 2rem' }}>
          <div className="max-w-5xl mx-auto">
            <ResearchBriefComponent
              brief={activeBrief}
              onGenerateMemo={handleGenerateMemo}
              memoLoading={memoLoading}
              memoError={memoError}
              onAsk={() => setChatOpen(true)}
              onNewSearch={() => setState('idle')}
              isStreaming={state === 'streaming'}
            />
          </div>
        </main>

        <BriefChat brief={activeBrief} isOpen={chatOpen} onClose={() => setChatOpen(false)} />

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

        {/* Loading State — shown only until first stream event */}
        {state === 'loading' && <LoadingState url={activeUrl} />}
      </div>
    </main>
  );
}
