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
  readonly avgCompliance: number | null;
}

export interface ComplianceBucket {
  readonly trades: number;
  readonly netTotal: number;
  readonly winRate: number;
}

export interface ComplianceCorrelation {
  readonly full: ComplianceBucket;
  readonly partial: ComplianceBucket;
  readonly scored: number;
  readonly unscored: number;
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
    {
      trades: number;
      netTotal: number;
      wins: number;
      losses: number;
      rSum: number;
      complianceSum: number;
      scored: number;
    }
  >();
  for (const t of trades) {
    for (const raw of keysFor(t)) {
      const key = displayKey(raw);
      const entry = groups.get(key) ?? {
        trades: 0,
        netTotal: 0,
        wins: 0,
        losses: 0,
        rSum: 0,
        complianceSum: 0,
        scored: 0,
      };
      entry.trades += 1;
      entry.netTotal += t.net;
      if (t.net > 0) entry.wins += 1;
      else if (t.net < 0) entry.losses += 1;
      entry.rSum += t.rMultiple;
      if (t.compliance !== null && t.compliance !== undefined) {
        entry.complianceSum += t.compliance;
        entry.scored += 1;
      }
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
      avgCompliance: s.scored > 0 ? s.complianceSum / s.scored : null,
      wins: s.wins,
      losses: s.losses,
      rSum: s.rSum,
      complianceSum: s.complianceSum,
      scored: s.scored,
    }))
    .sort((a, b) => b.netTotal - a.netTotal || a.value.localeCompare(b.value));

  const MAX_ROWS = 20;
  if (sorted.length <= MAX_ROWS) {
    return sorted.map(({ value, trades: count, netTotal, winRate, avgR, avgCompliance }) => ({
      value,
      trades: count,
      netTotal,
      winRate,
      avgR,
      avgCompliance,
    }));
  }

  const head = sorted.slice(0, MAX_ROWS);
  const tail = sorted.slice(MAX_ROWS);
  const tailTrades = tail.reduce((n, r) => n + r.trades, 0);
  const tailNet = tail.reduce((n, r) => n + r.netTotal, 0);
  const tailWins = tail.reduce((n, r) => n + r.wins, 0);
  const tailLosses = tail.reduce((n, r) => n + r.losses, 0);
  const tailR = tail.reduce((n, r) => n + r.rSum, 0);
  const tailCompliance = tail.reduce((n, r) => n + r.complianceSum, 0);
  const tailScored = tail.reduce((n, r) => n + r.scored, 0);
  const other: BreakdownRow = {
    value: `Other (${tail.length})`,
    trades: tailTrades,
    netTotal: tailNet,
    winRate: tailWins + tailLosses > 0 ? (tailWins / (tailWins + tailLosses)) * 100 : 0,
    avgR: tailTrades > 0 ? tailR / tailTrades : 0,
    avgCompliance: tailScored > 0 ? tailCompliance / tailScored : null,
  };
  return [
    ...head.map(({ value, trades: count, netTotal, winRate, avgR, avgCompliance }) => ({
      value,
      trades: count,
      netTotal,
      winRate,
      avgR,
      avgCompliance,
    })),
    other,
  ];
}

export type TimeDimension = 'weekday' | 'hour' | 'hold';

const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const HOLD_INTRADAY = 'Intraday (<24h)';
const HOLD_SHORT = '1-3 days';
const HOLD_SWING = 'Swing (>3d)';

const DAY_MS = 86_400_000;
const THREE_DAYS_MS = 259_200_000;

function hourLabel(hour: number): string {
  const padded = String(hour).padStart(2, '0');
  return `${padded}:00-${padded}:59`;
}

const HOUR_LABELS: readonly string[] = Array.from({ length: 24 }, (_, hour) =>
  hourLabel(hour),
);

const TIME_ORDER: Record<TimeDimension, readonly string[]> = {
  weekday: [...WEEKDAY_LABELS],
  hour: HOUR_LABELS,
  hold: [HOLD_INTRADAY, HOLD_SHORT, HOLD_SWING],
};

function timeKeyFor(trade: Trade, dimension: TimeDimension): string {
  if (dimension === 'weekday') {
    return WEEKDAY_LABELS[(new Date(trade.closedAt).getUTCDay() + 6) % 7]!;
  }
  if (dimension === 'hour') {
    return hourLabel(new Date(trade.closedAt).getUTCHours());
  }
  const holdMs = +new Date(trade.closedAt) - +new Date(trade.openedAt);
  if (holdMs < DAY_MS) return HOLD_INTRADAY;
  if (holdMs < THREE_DAYS_MS) return HOLD_SHORT;
  return HOLD_SWING;
}

export function computeTimePatterns(
  trades: readonly Trade[],
  dimension: TimeDimension,
): readonly BreakdownRow[] {
  if (trades.length === 0) return [];

  const groups = new Map<
    string,
    {
      trades: number;
      netTotal: number;
      wins: number;
      losses: number;
      rSum: number;
      complianceSum: number;
      scored: number;
    }
  >();
  for (const t of trades) {
    const key = timeKeyFor(t, dimension);
    const entry = groups.get(key) ?? {
      trades: 0,
      netTotal: 0,
      wins: 0,
      losses: 0,
      rSum: 0,
      complianceSum: 0,
      scored: 0,
    };
    entry.trades += 1;
    entry.netTotal += t.net;
    if (t.net > 0) entry.wins += 1;
    else if (t.net < 0) entry.losses += 1;
    entry.rSum += t.rMultiple;
    if (t.compliance !== null && t.compliance !== undefined) {
      entry.complianceSum += t.compliance;
      entry.scored += 1;
    }
    groups.set(key, entry);
  }

  return TIME_ORDER[dimension].map((value) => {
    const s = groups.get(value) ?? {
      trades: 0,
      netTotal: 0,
      wins: 0,
      losses: 0,
      rSum: 0,
      complianceSum: 0,
      scored: 0,
    };
    return {
      value,
      trades: s.trades,
      netTotal: s.netTotal,
      winRate: s.wins + s.losses > 0 ? (s.wins / (s.wins + s.losses)) * 100 : 0,
      avgR: s.trades > 0 ? s.rSum / s.trades : 0,
      avgCompliance: s.scored > 0 ? s.complianceSum / s.scored : null,
    };
  });
}

export function computeComplianceCorrelation(
  trades: readonly Trade[],
): ComplianceCorrelation {
  const emptyBucket = (): { trades: number; netTotal: number; wins: number; losses: number } => ({
    trades: 0,
    netTotal: 0,
    wins: 0,
    losses: 0,
  });
  const full = emptyBucket();
  const partial = emptyBucket();
  let unscored = 0;
  for (const t of trades) {
    const compliance = t.compliance ?? null;
    if (compliance === null) {
      unscored += 1;
      continue;
    }
    const bucket = compliance >= 100 - 1e-9 ? full : partial;
    bucket.trades += 1;
    bucket.netTotal += t.net;
    if (t.net > 0) bucket.wins += 1;
    else if (t.net < 0) bucket.losses += 1;
  }
  const toBucket = (b: { trades: number; netTotal: number; wins: number; losses: number }): ComplianceBucket => ({
    trades: b.trades,
    netTotal: b.netTotal,
    winRate: b.wins + b.losses > 0 ? (b.wins / (b.wins + b.losses)) * 100 : 0,
  });
  return {
    full: toBucket(full),
    partial: toBucket(partial),
    scored: full.trades + partial.trades,
    unscored,
  };
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
