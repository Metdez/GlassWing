import type { ResearchBrief } from '@/lib/types';

type Brief = Partial<ResearchBrief>;

// Returns the first real sentence from Claude text, skipping ALL-CAPS section headers
function firstRealSentence(text: string, wordLimit = 5): string {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Skip lines that look like "HEADER: ..." or all-caps labels
    if (/^[A-Z][A-Z\s]+:/.test(line)) continue;
    const words = line.replace(/^[-•*\d.]+\s*/, '').split(/\s+/);
    if (words.length > 0 && words[0]) {
      return words.slice(0, wordLimit).join(' ');
    }
  }
  return '—';
}

const JUNK_FUNDING = new Set(['no', 'none', 'unknown', 'n/a', 'undisclosed', '-', '—']);

export function getTeamHeadline(b: Brief): string {
  // Prefer structured leadership data
  const leaders = b.companyLeadership;
  if (leaders?.length) {
    const first = leaders[0].name.split(' ')[0]; // first name only
    const rest = leaders.length - 1;
    return rest > 0 ? `${first} + ${rest}` : first;
  }
  const text = b.sections?.foundingTeam;
  if (!text?.trim()) return '—';
  // Try to find a founder count
  const countMatch = text.match(/(\d+)\s+(?:co-)?founder/i);
  if (countMatch) return `${countMatch[1]} founders`;
  // Try to find a name (capitalized word pair)
  const nameMatch = text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
  if (nameMatch) return nameMatch[1];
  return firstRealSentence(text, 4);
}

export function getFitHeadline(b: Brief): string {
  const text = b.sections?.glasswingRelevance;
  if (!text?.trim()) return '—';
  const match = text.match(/\b(strong|moderate|weak|high|low)\b/i);
  if (match) {
    const w = match[1];
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }
  return firstRealSentence(text, 3);
}

export function getFlagsHeadline(b: Brief): string {
  const text = b.sections?.redFlags;
  if (!text?.trim()) return '—';
  const count = (text.match(/^[-•*]|\d+\./gm) ?? []).length;
  return count >= 2 ? `${count} flags` : 'See flags';
}

export function getProductHeadline(b: Brief): string {
  const text = b.sections?.product;
  if (!text?.trim()) return '—';
  // Try to find a product type keyword
  const typeMatch = text.match(/\b(SaaS|API|platform|marketplace|app|tool|service|software|network)\b/i);
  if (typeMatch) {
    // grab the word before it too for context
    const idx = text.indexOf(typeMatch[0]);
    const before = text.slice(0, idx).trim().split(/\s+/).slice(-1)[0] ?? '';
    const combined = before ? `${before} ${typeMatch[0]}` : typeMatch[0];
    return combined.slice(0, 22);
  }
  return text.trim().split(/\s+/).slice(0, 5).join(' ') || '—';
}

export function getMarketHeadline(b: Brief): string {
  const text = b.sections?.targetMarket;
  if (!text?.trim()) return '—';
  const match = text.match(/\$[\d.]+[BM]/i);
  if (match) return match[0];
  return firstRealSentence(text, 3);
}

export function getCompetitorsHeadline(b: Brief): string {
  if (b.competitorData?.length) return `${b.competitorData.length} identified`;
  if (b.competitors?.length) return `${b.competitors.length} found`;
  return '—';
}

export function getFundingHeadline(b: Brief): string {
  const stage = b.orgEnrichment?.latestFundingStage?.trim();
  if (stage && !JUNK_FUNDING.has(stage.toLowerCase())) return stage;
  const totalFunding = b.orgEnrichment?.totalFunding?.trim();
  if (totalFunding && !JUNK_FUNDING.has(totalFunding.toLowerCase())) return totalFunding;
  // Fall back to section text — look for a round name
  const text = b.sections?.fundingAnalysis;
  if (!text?.trim()) return 'Unfunded';
  const roundMatch = text.match(/\b(pre-?seed|seed|series [a-z]|ipo|bootstrapped|unfunded)\b/i);
  if (roundMatch) return roundMatch[1];
  return 'Unfunded';
}

export function getMoatHeadline(b: Brief): string {
  const text = b.sections?.competitiveMoat;
  if (!text?.trim()) return '—';
  return firstRealSentence(text, 5);
}

export function getPeopleHeadline(b: Brief): string {
  const count = b.companyLeadership?.length ?? 0;
  const alumni = b.companyAlumni?.length ?? 0;
  if (count) return alumni ? `${count} leaders, ${alumni} alumni` : `${count} leaders`;
  return '—';
}

export function getIntelHeadline(b: Brief): string {
  const newsCount = (b.newsResults?.length ?? 0) + (b.apolloNewsArticles?.length ?? 0);
  if (newsCount) return `${newsCount} articles`;
  const text = b.sections?.newsAndPress;
  if (!text?.trim()) return '—';
  // Skip "No press coverage..." type leads
  if (/^no\s/i.test(text.trim())) return 'No press coverage';
  return firstRealSentence(text, 3);
}
