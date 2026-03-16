'use client';
import { useState, FormEvent } from 'react';

interface Props {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let url = value.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    onSubmit(url);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}>
        Paste any company URL for an instant VC research brief
      </p>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste a company URL..."
            disabled={isLoading}
            className="w-full px-4 py-3 text-base rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ibm-sans)',
              caretColor: 'var(--accent)',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-6 py-3 rounded-lg font-medium text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontFamily: 'var(--font-jetbrains)',
            letterSpacing: '0.05em',
          }}
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </div>
      {!isLoading && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Examples:</span>
            {['stripe.com', 'openai.com', 'scale.ai'].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  const fullUrl = `https://${chip}`;
                  setValue(fullUrl);
                  onSubmit(fullUrl);
                }}
                className="px-2.5 py-1 text-[11px] rounded transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ibm-mono)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
            Press Enter to analyze
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
            Powered by Claude · Firecrawl · Apollo
          </p>
        </div>
      )}
    </form>
  );
}
