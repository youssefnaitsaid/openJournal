import type { Trade } from '../trades/trade';

export interface BalancePoint {
  closedAt: string;
  balance: number;
}

export interface DashboardMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  netTotal: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  dayWinRate: number;
  balanceCurve: BalancePoint[];
  recent: Trade[];
}

export function computeMetrics(
  trades: readonly Trade[],
  startingBalance: number,
  recentLimit = 10,
): DashboardMetrics {
  const wins = trades.filter((t) => t.net > 0);
  const losses = trades.filter((t) => t.net < 0);
  const winSum = wins.reduce((sum, t) => sum + t.net, 0);
  const lossSum = losses.reduce((sum, t) => sum + t.net, 0);
  const counted = wins.length + losses.length;

  const byCloseAsc = [...trades].sort(
    (a, b) => +new Date(a.closedAt) - +new Date(b.closedAt),
  );
  let balance = startingBalance;
  const balanceCurve = byCloseAsc.map((t) => {
    balance += t.net;
    return { closedAt: t.closedAt, balance };
  });

  const dayNets = new Map<string, number>();
  for (const t of trades) {
    const day = t.closedAt.slice(0, 10);
    dayNets.set(day, (dayNets.get(day) ?? 0) + t.net);
  }
  const countedDays = [...dayNets.values()].filter((net) => net !== 0);
  const winningDays = countedDays.filter((net) => net > 0).length;

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: trades.length - counted,
    winRate: counted > 0 ? (wins.length / counted) * 100 : 0,
    netTotal: trades.reduce((sum, t) => sum + t.net, 0),
    avgWin: wins.length > 0 ? winSum / wins.length : 0,
    avgLoss: losses.length > 0 ? lossSum / losses.length : 0,
    profitFactor:
      lossSum !== 0
        ? winSum / Math.abs(lossSum)
        : wins.length > 0
          ? Infinity
          : 0,
    dayWinRate:
      countedDays.length > 0 ? (winningDays / countedDays.length) * 100 : 0,
    balanceCurve,
    recent: [...trades]
      .sort((a, b) => +new Date(b.closedAt) - +new Date(a.closedAt))
      .slice(0, recentLimit),
  };
}
