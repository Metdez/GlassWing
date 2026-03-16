'use client';
import { useEffect, useState } from 'react';

interface Props {
  url: string;
}

const MESSAGES = [
  { delay: 0,     text: (url: string) => `Analyzing ${url}...` },
  { delay: 2000,  text: () => 'Scraping website content...' },
  { delay: 5000,  text: () => 'Running competitive intelligence...' },
  { delay: 10000, text: () => 'Enriching company data...' },
  { delay: 20000, text: () => 'Identifying leadership team...' },
  { delay: 35000, text: () => 'Running AI analysis across all signals...' },
];

export default function LoadingState({ url }: Props) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    MESSAGES.forEach(({ delay, text }) => {
      const t = setTimeout(() => {
        setVisible(prev => [...prev, text(url)]);
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [url]);

  return (
    <div
      className="w-full rounded-xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
        >
          Analyzing
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((msg, i) => (
          <p
            key={i}
            className="loading-message text-sm"
            style={{
              color: i === visible.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-ibm-sans)',
            }}
          >
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
