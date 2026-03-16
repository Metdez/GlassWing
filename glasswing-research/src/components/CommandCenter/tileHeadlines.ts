import type { ResearchBrief } from '@/lib/types';

type Brief = Partial<ResearchBrief>;

export function getTeamHeadline(b: Brief): string {
  const text = b.sections?.foundingTeam;
  if (!text?.trim()) return '—';
  const match = text.match(/(\d+)\s+(?:co-)?founder/i);
  if (match) return `${match[1]} founders`;
  const first = text.split(/[.\n]/)[0]?.trim() ?? '';
  return first.slice(0, 30) || '—';
}

export function getFitHeadline(b: Brief): string {
  const text = b.sections?.glasswingRelevance;
  if (!text?.trim()) return '—';
  const match = text.match(/\b(strong|moderate|weak|high|low)\b/i);
  if (match) {
    const w = match[1];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  return text.trim().split(/\s+/).slice(0, 3).join(' ') || '—';
}

export function getFlagsHeadline(b: Brief): string {
  const text = b.sections?.redFlags;
  if (!text?.trim()) return '—';
  const count = (text.match(/^[-•*]|\d+\./gm) ?? []).length;
  return count >= 2 ? `${count} items` : 'See flags';
}

export function getProductHeadline(b: Brief): string {
  const text = b.sections?.product;
  if (!text?.trim()) return '—';
  return text.trim().split(/\s+/).slice(0, 4).join(' ') || '—';
}

export function getMarketHeadline(b: Brief): string {
  const text = b.sections?.targetMarket;
  if (!text?.trim()) return '—';
  const match = text.match(/\$[\d.]+[BM]/i);
  if (match) return match[0];
  return text.trim().split(/\s+/).slice(0, 3).join(' ') || '—';
}

export function getCompetitorsHeadline(b: Brief): string {
  if (b.competitorData?.length) return `${b.competitorData.length} identified`;
  if (b.competitors?.length) return `${b.competitors.length} found`;
  return '—';
}

export function getFundingHeadline(b: Brief): string {
  if (b.orgEnrichment?.latestFundingStage) return b.orgEnrichment.latestFundingStage;
  const text = b.sections?.fundingAnalysis;
  if (!text?.trim()) return '—';
  return text.trim().split(/\s+/)[0] ?? '—';
}

export function getMoatHeadline(b: Brief): string {
  const text = b.sections?.competitiveMoat;
  if (!text?.trim()) return '—';
  return text.trim().split(/\s+/).slice(0, 4).join(' ') || '—';
}

export function getPeopleHeadline(b: Brief): string {
  const count = b.companyLeadership?.length;
  return count ? `${count} leaders` : '—';
}

export function getIntelHeadline(b: Brief): string {
  const count = b.apolloNewsArticles?.length;
  if (count) return `${count} articles`;
  const text = b.sections?.newsAndPress;
  if (!text?.trim()) return '—';
  return text.trim().split(/\s+/).slice(0, 3).join(' ') || '—';
}
