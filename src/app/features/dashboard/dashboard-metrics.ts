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
  maxDrawdown: number;
  maxDrawdownPct: number;
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  expectancy: number;
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
  const stepped = byCloseAsc.map((t) => {
    balance += t.net;
    return { closedAt: t.closedAt, balance };
  });
  const balanceCurve =
    byCloseAsc.length === 0
      ? []
      : [{ closedAt: byCloseAsc[0]!.closedAt, balance: startingBalance }, ...stepped];

  const dayNets = new Map<string, number>();
  for (const t of trades) {
    const day = t.closedAt.slice(0, 10);
    dayNets.set(day, (dayNets.get(day) ?? 0) + t.net);
  }
  const countedDays = [...dayNets.values()].filter((net) => net !== 0);
  const winningDays = countedDays.filter((net) => net > 0).length;

  let peak = -Infinity;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  for (const p of balanceCurve) {
    if (p.balance > peak) peak = p.balance;
    const drop = peak - p.balance;
    if (drop > maxDrawdown) {
      maxDrawdown = drop;
      maxDrawdownPct = peak !== 0 ? (drop / peak) * 100 : 0;
    }
  }

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  for (const t of byCloseAsc) {
    if (t.net > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (t.net < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  const netTotal = trades.reduce((sum, t) => sum + t.net, 0);

  return {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: trades.length - counted,
    winRate: counted > 0 ? (wins.length / counted) * 100 : 0,
    netTotal,
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
    maxDrawdown,
    maxDrawdownPct,
    currentWinStreak,
    currentLossStreak,
    longestWinStreak,
    longestLossStreak,
    expectancy: trades.length > 0 ? netTotal / trades.length : 0,
    balanceCurve,
    recent: [...trades]
      .sort((a, b) => +new Date(b.closedAt) - +new Date(a.closedAt))
      .slice(0, recentLimit),
  };
}
