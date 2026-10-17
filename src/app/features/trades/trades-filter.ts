import type { Grade, Side, Trade } from './trade';

export type OutcomeFilter = 'All' | 'Win' | 'Loss' | 'Breakeven';

export interface GlobalFilter {
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly asset: string;
  readonly setup: string;
  readonly side: '' | Side;
  readonly tag: string;
  readonly outcome: OutcomeFilter;
  readonly grade: '' | Grade;
  readonly needsReview: boolean;
}

export const EMPTY_FILTER: GlobalFilter = {
  dateFrom: '',
  dateTo: '',
  asset: '',
  setup: '',
  side: '',
  tag: '',
  outcome: 'All',
  grade: '',
  needsReview: false,
};

export function isFilterActive(filter: GlobalFilter): boolean {
  return (
    filter.dateFrom !== '' ||
    filter.dateTo !== '' ||
    filter.asset !== '' ||
    filter.setup !== '' ||
    filter.side !== '' ||
    filter.tag !== '' ||
    filter.outcome !== 'All' ||
    filter.grade !== '' ||
    filter.needsReview !== false
  );
}

export function applyGlobalFilter(
  trades: readonly Trade[],
  filter: GlobalFilter,
): Trade[] {
  const assetNeedle = filter.asset.toLowerCase();
  return trades.filter((t) => {
    if (assetNeedle !== '' && !t.asset.toLowerCase().includes(assetNeedle))
      return false;
    if (filter.setup !== '' && t.setup !== filter.setup) return false;
    if (filter.side !== '' && t.side !== filter.side) return false;
    if (filter.tag !== '' && !(t.tags ?? []).includes(filter.tag)) return false;
    if (filter.grade !== '' && t.grade !== filter.grade) return false;
    if (filter.needsReview && t.grade !== 'C' && t.grade !== 'D') return false;
    if (filter.outcome === 'Win' && !(t.net > 0)) return false;
    if (filter.outcome === 'Loss' && !(t.net < 0)) return false;
    if (filter.outcome === 'Breakeven' && t.net !== 0) return false;
    const day = t.closedAt.slice(0, 10);
    if (filter.dateFrom !== '' && day < filter.dateFrom) return false;
    if (filter.dateTo !== '' && day > filter.dateTo) return false;
    return true;
  });
}
