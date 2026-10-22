import type { Trade } from '../trades/trade';

export interface BalancePoint {
  closedAt: string;
  balance: number;
}

export interface KpiLine {
  readonly label: string;
  readonly value: string;
}

// Presentation-only formatters: the band shows the same derived numbers the
// old tile strip showed, now with thousands grouping so a trading desk scans
// currency at speed. Values are unchanged; only their display is tightened.
const money2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moneyAuto = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const formatBandNumber = (value: number): string => `${value}`;

export const formatPercent = (value: number): string => value.toFixed(2);

export const formatSignedDollars = (value: number): string => {
  const abs = money2.format(Math.abs(value));
  if (value > 0) return `+$${abs}`;
  if (value < 0) return `-$${abs}`;
  return `$0.00`;
};

// Unsigned currency with grouping and fixed cents — balances and drawdown.
export const formatDollars = (value: number): string =>
  `$${money2.format(value)}`;

export const formatProfitFactor = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(2) : '∞';

export const formatStreaks = (m: DashboardMetrics): string =>
  `Current ${m.currentWinStreak}W · ${m.currentLossStreak}L / Best ${m.longestWinStreak}W · ${m.longestLossStreak}L`;

export interface GuardStatusInput {
  dailyLoss: { spent: number; limit: number | null };
  dailyTrades: { count: number; limit: number | null };
  dailyStop: string | null;
  weeklyLoss: { spent: number; limit: number | null };
  weeklyTrades: { count: number; limit: number | null };
  breaches: readonly string[];
}

// Read-only status line text: only configured limits surface, and any breach
// names trail. Never renders an editor — this is presentation of Guard state.
export function formatGuardStatus(input: GuardStatusInput): string {
  const segments: string[] = [];
  const money = (value: number): string => `$${moneyAuto.format(value)}`;
  if (input.dailyLoss.limit !== null)
    segments.push(
      `Daily loss ${money(input.dailyLoss.spent)} / ${money(input.dailyLoss.limit)}`,
    );
  if (input.dailyTrades.limit !== null)
    segments.push(
      `Daily trades ${input.dailyTrades.count} / ${input.dailyTrades.limit}`,
    );
  if (input.dailyStop !== null) segments.push(`Stop ${input.dailyStop}`);
  if (input.weeklyLoss.limit !== null)
    segments.push(
      `Weekly loss ${money(input.weeklyLoss.spent)} / ${money(input.weeklyLoss.limit)}`,
    );
  if (input.weeklyTrades.limit !== null)
    segments.push(
      `Weekly trades ${input.weeklyTrades.count} / ${input.weeklyTrades.limit}`,
    );
  if (input.breaches.length > 0)
    segments.push(`Breached: ${input.breaches.join(', ')}`);
  else segments.push('Inside all Guards');
  return segments.join(' · ');
}

export function computeKpiBand(
  m: DashboardMetrics,
  startingBalance: number,
): KpiLine[] {
  return [
    { label: 'Trade win %', value: formatPercent(m.winRate) },
    { label: 'Profit factor', value: formatProfitFactor(m.profitFactor) },
    { label: 'Day win %', value: formatPercent(m.dayWinRate) },
    {
      label: 'Avg win / loss',
      value: `${formatSignedDollars(m.avgWin)} / ${formatSignedDollars(m.avgLoss)}`,
    },
    { label: 'Total trades', value: `${m.totalTrades}` },
    {
      label: 'Max drawdown',
      value: `${formatDollars(m.maxDrawdown)} · ${formatPercent(m.maxDrawdownPct)}%`,
    },
    { label: 'Streaks', value: formatStreaks(m) },
    { label: 'Expectancy / Trade', value: formatSignedDollars(m.expectancy) },
    {
      label: 'Current balance',
      value: formatDollars(startingBalance + m.netTotal),
    },
  ];
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
