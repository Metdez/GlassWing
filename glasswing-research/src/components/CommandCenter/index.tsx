'use client';
import { useState } from 'react';
import type { ResearchBrief } from '@/lib/types';
import SignalTile from './SignalTile';
import DetailPanel from './DetailPanel';
import {
  getTeamHeadline,
  getProductHeadline,
  getMarketHeadline,
  getCompetitorsHeadline,
  getFundingHeadline,
  getMoatHeadline,
  getFlagsHeadline,
  getPeopleHeadline,
  getIntelHeadline,
  getFitHeadline,
} from './tileHeadlines';

export type TileId =
  | 'team' | 'product' | 'market' | 'competitors' | 'funding'
  | 'moat' | 'flags' | 'people' | 'intel' | 'fit';

interface TileDef {
  id: TileId;
  label: string;
  getHeadline: (b: Partial<ResearchBrief>) => string;
}

const TILES: TileDef[] = [
  { id: 'team',        label: 'TEAM',        getHeadline: getTeamHeadline },
  { id: 'product',     label: 'PRODUCT',     getHeadline: getProductHeadline },
  { id: 'market',      label: 'MARKET',      getHeadline: getMarketHeadline },
  { id: 'competitors', label: 'COMPETITORS', getHeadline: getCompetitorsHeadline },
  { id: 'funding',     label: 'FUNDING',     getHeadline: getFundingHeadline },
  { id: 'moat',        label: 'MOAT',        getHeadline: getMoatHeadline },
  { id: 'flags',       label: 'FLAGS',       getHeadline: getFlagsHeadline },
  { id: 'people',      label: 'PEOPLE',      getHeadline: getPeopleHeadline },
  { id: 'intel',       label: 'INTEL',       getHeadline: getIntelHeadline },
  { id: 'fit',         label: 'FIT',         getHeadline: getFitHeadline },
];

interface Props {
  brief: Partial<ResearchBrief>;
  isStreaming: boolean;
}

export default function CommandCenter({ brief, isStreaming }: Props) {
  const [activeTile, setActiveTile] = useState<TileId | null>(null);

  const handleTileClick = (id: TileId) => {
    setActiveTile(prev => prev === id ? null : id);
  };

  const panelOpen = activeTile !== null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Tile grid — always full width */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        {TILES.map(tile => {
          const headline = tile.getHeadline(brief);
          const isEmpty = headline === '—';
          const isSkeleton = isStreaming && isEmpty;
          return (
            <SignalTile
              key={tile.id}
              label={tile.label}
              headline={headline}
              isActive={activeTile === tile.id}
              isSkeleton={isSkeleton}
              onClick={() => handleTileClick(tile.id)}
            />
          );
        })}
      </div>

      {/* Backdrop — closes panel on outside click */}
      {panelOpen && (
        <div
          onClick={() => setActiveTile(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10 }}
        />
      )}

      {/* Overlay panel — slides in from right, floats above grid */}
      <div
        className="brief-overlay-panel"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 'min(520px, 60vw)',
          zIndex: 20,
          transform: panelOpen ? 'translateX(0)' : 'translateX(calc(100% + 16px))',
          transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: panelOpen ? 'auto' : 'none',
        }}
      >
        {activeTile && (
          <DetailPanel
            tileId={activeTile}
            brief={brief}
            onClose={() => setActiveTile(null)}
          />
        )}
      </div>
    </div>
  );
}
