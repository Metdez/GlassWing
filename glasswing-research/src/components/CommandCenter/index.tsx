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
  color: 'default' | 'green' | 'orange';
  getHeadline: (b: Partial<ResearchBrief>) => string;
}

const TILES: TileDef[] = [
  { id: 'team',        label: 'TEAM',        color: 'default', getHeadline: getTeamHeadline },
  { id: 'product',     label: 'PRODUCT',     color: 'default', getHeadline: getProductHeadline },
  { id: 'market',      label: 'MARKET',      color: 'default', getHeadline: getMarketHeadline },
  { id: 'competitors', label: 'COMPETITORS', color: 'default', getHeadline: getCompetitorsHeadline },
  { id: 'funding',     label: 'FUNDING',     color: 'green',   getHeadline: getFundingHeadline },
  { id: 'moat',        label: '⬡ MOAT',      color: 'orange',  getHeadline: getMoatHeadline },
  { id: 'flags',       label: '⚠ FLAGS',     color: 'orange',  getHeadline: getFlagsHeadline },
  { id: 'people',      label: 'PEOPLE',      color: 'default', getHeadline: getPeopleHeadline },
  { id: 'intel',       label: 'INTEL',       color: 'default', getHeadline: getIntelHeadline },
  { id: 'fit',         label: 'FIT',         color: 'green',   getHeadline: getFitHeadline },
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
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'flex-start' }}>
      {/* Grid zone */}
      <div
        className="brief-grid-zone"
        style={{ width: panelOpen ? '45%' : '100%' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
          }}
        >
          {TILES.map(tile => {
            const headline = tile.getHeadline(brief);
            const isEmpty = headline === '—';
            // Skeleton: streaming and no data yet
            const isSkeleton = isStreaming && isEmpty;
            return (
              <SignalTile
                key={tile.id}
                label={tile.label}
                headline={headline}
                tileColor={tile.color}
                isActive={activeTile === tile.id}
                isSkeleton={isSkeleton}
                onClick={() => handleTileClick(tile.id)}
              />
            );
          })}
        </div>
      </div>

      {/* Panel zone */}
      {panelOpen && (
        <div
          className="brief-panel-zone"
          style={{ width: '55%' }}
        >
          <DetailPanel
            tileId={activeTile}
            brief={brief}
            onClose={() => setActiveTile(null)}
          />
        </div>
      )}
    </div>
  );
}
