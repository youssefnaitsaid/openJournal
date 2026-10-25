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

export function countActiveFilterAxes(filter: GlobalFilter): number {
  let count = 0;
  // The close-date range is one axis even when both ends are set.
  if (filter.dateFrom !== '' || filter.dateTo !== '') count += 1;
  if (filter.asset !== '') count += 1;
  if (filter.setup !== '') count += 1;
  if (filter.side !== '') count += 1;
  if (filter.tag !== '') count += 1;
  if (filter.outcome !== 'All') count += 1;
  if (filter.grade !== '') count += 1;
  if (filter.needsReview) count += 1;
  return count;
}

export function isFilterActive(filter: GlobalFilter): boolean {
  return countActiveFilterAxes(filter) > 0;
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
