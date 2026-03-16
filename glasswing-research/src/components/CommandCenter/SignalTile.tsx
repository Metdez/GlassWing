'use client';

interface Props {
  label: string;
  headline: string;
  isActive?: boolean;
  isSkeleton?: boolean;
  onClick?: () => void;
}

export default function SignalTile({
  label,
  headline,
  isActive = false,
  isSkeleton = false,
  onClick,
}: Props) {
  const isEmpty = headline === '—';
  const interactive = !isEmpty && !isSkeleton;

  const borderColor = isActive ? 'var(--accent)' : 'var(--border)';

  return (
    <button
      className="signal-tile rounded-lg text-left w-full"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        padding: '20px',
        minHeight: '110px',
        opacity: isEmpty ? 0.45 : 1,
        cursor: interactive ? 'pointer' : 'default',
        boxShadow: isActive ? `0 0 0 1px var(--accent)` : undefined,
      }}
    >
      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '10px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-jetbrains)',
        }}
      >
        {label}
      </div>

      {isSkeleton ? (
        <div
          className="tile-skeleton rounded"
          style={{ height: '14px', width: '60%', background: 'var(--border)' }}
        />
      ) : (
        <div
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)',
            fontFamily: 'var(--font-jetbrains)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
          }}
        >
          {headline}
        </div>
      )}
    </button>
  );
}
