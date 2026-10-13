import type { Trade } from '../trades/trade';

export interface AnalyticsMetrics {
  readonly totalTrades: number;
  readonly riskedCount: number;
  readonly rExpectancy: number;
  readonly medianR: number;
  readonly rSum: number;
  readonly riskedTotal: number;
  readonly netTotal: number;
}

export interface BreakdownRow {
  readonly value: string;
  readonly trades: number;
  readonly netTotal: number;
  readonly winRate: number;
  readonly avgR: number;
}

export type BreakdownDimension =
  | 'setup'
  | 'asset'
  | 'market'
  | 'side'
  | 'emotionBefore'
  | 'emotionAfter'
  | 'mistake'
  | 'grade'
  | 'tag';

export function computeBreakdowns(
  trades: readonly Trade[],
  dimension: BreakdownDimension,
): readonly BreakdownRow[] {
  if (trades.length === 0) return [];

  const keyFor = (t: Trade, dim: Exclude<BreakdownDimension, 'tag'>): string => {
    switch (dim) {
      case 'setup':
        return t.setup;
      case 'asset':
        return t.asset;
      case 'market':
        return t.market;
      case 'side':
        return t.side;
      case 'emotionBefore':
        return t.emotionBefore;
      case 'emotionAfter':
        return t.emotionAfter;
      case 'mistake':
        return t.mistake;
      case 'grade':
        return t.grade ?? '';
    }
  };

  const keysFor = (t: Trade): readonly string[] => {
    if (dimension === 'tag') {
      const tags = t.tags ?? [];
      return tags.length > 0 ? tags : [''];
    }
    return [keyFor(t, dimension)];
  };

  const displayKey = (raw: string): string =>
    raw.trim() === '' ? '(Unspecified)' : raw;

  const groups = new Map<
    string,
    { trades: number; netTotal: number; wins: number; losses: number; rSum: number }
  >();
  for (const t of trades) {
    for (const raw of keysFor(t)) {
      const key = displayKey(raw);
      const entry = groups.get(key) ?? { trades: 0, netTotal: 0, wins: 0, losses: 0, rSum: 0 };
      entry.trades += 1;
      entry.netTotal += t.net;
      if (t.net > 0) entry.wins += 1;
      else if (t.net < 0) entry.losses += 1;
      entry.rSum += t.rMultiple;
      groups.set(key, entry);
    }
  }

  const sorted = [...groups.entries()]
    .map(([value, s]) => ({
      value,
      trades: s.trades,
      netTotal: s.netTotal,
      winRate: s.wins + s.losses > 0 ? (s.wins / (s.wins + s.losses)) * 100 : 0,
      avgR: s.trades > 0 ? s.rSum / s.trades : 0,
      wins: s.wins,
      losses: s.losses,
      rSum: s.rSum,
    }))
    .sort((a, b) => b.netTotal - a.netTotal || a.value.localeCompare(b.value));

  const MAX_ROWS = 20;
  if (sorted.length <= MAX_ROWS) {
    return sorted.map(({ value, trades: count, netTotal, winRate, avgR }) => ({
      value,
      trades: count,
      netTotal,
      winRate,
      avgR,
    }));
  }

  const head = sorted.slice(0, MAX_ROWS);
  const tail = sorted.slice(MAX_ROWS);
  const tailTrades = tail.reduce((n, r) => n + r.trades, 0);
  const tailNet = tail.reduce((n, r) => n + r.netTotal, 0);
  const tailWins = tail.reduce((n, r) => n + r.wins, 0);
  const tailLosses = tail.reduce((n, r) => n + r.losses, 0);
  const tailR = tail.reduce((n, r) => n + r.rSum, 0);
  const other: BreakdownRow = {
    value: `Other (${tail.length})`,
    trades: tailTrades,
    netTotal: tailNet,
    winRate: tailWins + tailLosses > 0 ? (tailWins / (tailWins + tailLosses)) * 100 : 0,
    avgR: tailTrades > 0 ? tailR / tailTrades : 0,
  };
  return [
    ...head.map(({ value, trades: count, netTotal, winRate, avgR }) => ({
      value,
      trades: count,
      netTotal,
      winRate,
      avgR,
    })),
    other,
  ];
}

export function computeRMetrics(trades: readonly Trade[]): AnalyticsMetrics {
  const rValues = trades.map((t) => t.rMultiple);
  const rSum = rValues.reduce((sum, r) => sum + r, 0);
  const sorted = [...rValues].sort((a, b) => a - b);
  let medianR = 0;
  if (sorted.length > 0) {
    const mid = Math.floor(sorted.length / 2);
    medianR =
      sorted.length % 2 === 1
        ? sorted[mid]!
        : (sorted[mid - 1]! + sorted[mid]!) / 2;
  }

  return {
    totalTrades: trades.length,
    riskedCount: trades.filter((t) => t.risked !== 0).length,
    rExpectancy: trades.length > 0 ? rSum / trades.length : 0,
    medianR,
    rSum,
    riskedTotal: trades.reduce((sum, t) => sum + t.risked, 0),
    netTotal: trades.reduce((sum, t) => sum + t.net, 0),
  };
}
