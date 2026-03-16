'use client';

type TileColor = 'default' | 'green' | 'orange';

interface Props {
  label: string;
  headline: string;
  tileColor?: TileColor;
  isActive?: boolean;
  isSkeleton?: boolean;
  onClick?: () => void;
}

const TILE_BORDER: Record<TileColor, string> = {
  default: 'var(--border)',
  green:   'var(--accent-green)',
  orange:  'var(--accent-orange)',
};

export default function SignalTile({
  label,
  headline,
  tileColor = 'default',
  isActive = false,
  isSkeleton = false,
  onClick,
}: Props) {
  const isEmpty = headline === '—';
  const interactive = !isEmpty && !isSkeleton;

  const borderColor = isActive
    ? 'var(--accent)'
    : TILE_BORDER[tileColor];

  return (
    <button
      className="signal-tile rounded-lg text-left w-full"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px 14px',
        opacity: isEmpty ? 0.45 : 1,
        boxShadow: isActive ? `0 0 0 1px var(--accent)` : undefined,
      }}
    >
      <div
        className="text-[9px] uppercase tracking-widest mb-2"
        style={{
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
          className="text-sm font-medium"
          style={{
            color: isEmpty ? 'var(--text-secondary)' : 'var(--text-primary)',
            fontFamily: 'var(--font-jetbrains)',
          }}
        >
          {headline}
        </div>
      )}
    </button>
  );
}
