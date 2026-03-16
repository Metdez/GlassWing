'use client';
import { useState, useRef, useEffect } from 'react';
import type { ResearchBrief } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STARTER_QUESTIONS = [
  'Why can\'t a big company do this?',
  'Who should I reach out to first?',
  'What\'s the biggest risk?',
  'Is this a good fit for Glasswing?',
  'Summarize this in 2 sentences for a partner',
];

export default function BriefChat({ brief, isOpen, onClose }: { brief: ResearchBrief; isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: question };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          question,
          history: messages,
        }),
      });
      const data = await res.json();
      const answer = data.answer ?? data.error ?? 'Something went wrong.';
      setMessages([...updatedHistory, { role: 'assistant', content: answer }]);
    } catch {
      setMessages([
        ...updatedHistory,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Semi-transparent backdrop */}
      {isOpen && (
        <div 
          onClick={onClose} 
          style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)' }} 
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(320px, 100vw)',
          height: '100vh',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          zIndex: 50,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 51 }}>
          <button 
            onClick={onClose} 
            style={{ 
              color: 'var(--text-secondary)', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '18px',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
        {/* Header */}
      <div
        style={{
          borderLeft: '3px solid var(--accent)',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>◈</span>
          <span
            className="text-xs uppercase tracking-widest"
            style={{
              color: 'var(--accent)',
              fontFamily: 'var(--font-jetbrains)',
            }}
          >
            Ask Anything
          </span>
        </div>
        <p
          className="mt-1 text-sm"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ibm-sans)',
          }}
        >
          Ask follow-up questions about {brief.companyName}
        </p>
      </div>

      {/* Starter chips — only before first message */}
      {messages.length === 0 && (
        <div
          className="flex flex-wrap gap-2"
          style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}
        >
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '2rem',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-ibm-sans)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--text-secondary)';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '0.65rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  fontFamily: 'var(--font-ibm-sans)',
                  ...(msg.role === 'user'
                    ? {
                        background: 'var(--accent)',
                        color: '#fff',
                      }
                    : {
                        background: '#0a0a0f',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }),
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '0.65rem',
                  background: '#0a0a0f',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: '0.3rem',
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: messages.length > 0 ? '1px solid var(--border)' : undefined,
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask anything about this company..."
          style={{
            flex: 1,
            background: '#0a0a0f',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
            padding: '0.55rem 0.85rem',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ibm-mono)',
            outline: 'none',
            opacity: loading ? 0.6 : 1,
          }}
          onFocus={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '0.5rem',
            padding: '0.55rem 1rem',
            fontSize: '0.8rem',
            color: '#fff',
            fontFamily: 'var(--font-jetbrains)',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      </div>
    </>
  );
}
