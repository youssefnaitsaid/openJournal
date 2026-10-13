import type { Trade } from '../trades/trade';

export interface SetupR {
  readonly setup: string;
  readonly trades: number;
  readonly avgR: number;
  readonly totalR: number;
}

export interface AnalyticsMetrics {
  readonly totalTrades: number;
  readonly riskedCount: number;
  readonly rExpectancy: number;
  readonly medianR: number;
  readonly rSum: number;
  readonly riskedTotal: number;
  readonly netTotal: number;
  readonly bySetup: readonly SetupR[];
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

  const bySetupMap = new Map<string, { trades: number; totalR: number }>();
  for (const t of trades) {
    const entry = bySetupMap.get(t.setup) ?? { trades: 0, totalR: 0 };
    entry.trades += 1;
    entry.totalR += t.rMultiple;
    bySetupMap.set(t.setup, entry);
  }
  const bySetup: readonly SetupR[] = [...bySetupMap.entries()]
    .map(([setup, { trades: count, totalR }]) => ({
      setup,
      trades: count,
      avgR: totalR / count,
      totalR,
    }))
    .sort((a, b) => b.avgR - a.avgR);

  return {
    totalTrades: trades.length,
    riskedCount: trades.filter((t) => t.risked !== 0).length,
    rExpectancy: trades.length > 0 ? rSum / trades.length : 0,
    medianR,
    rSum,
    riskedTotal: trades.reduce((sum, t) => sum + t.risked, 0),
    netTotal: trades.reduce((sum, t) => sum + t.net, 0),
    bySetup,
  };
}
