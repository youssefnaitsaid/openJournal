import { computeMetrics } from '../dashboard/dashboard-metrics';
import type { Trade } from '../trades/trade';

export interface DayCell {
  date: string;
  trades: Trade[];
  dayNet: number;
}

export type CalendarWeek = (DayCell | null)[];

function dayKey(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function buildMonth(
  trades: readonly Trade[],
  year: number,
  month: number,
): CalendarWeek[] {
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = t.closedAt.slice(0, 10);
    const list = byDay.get(key);
    if (list) list.push(t);
    else byDay.set(key, [t]);
  }
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = dayKey(year, month, day);
    const dayTrades = byDay.get(date) ?? [];
    cells.push({
      date,
      trades: dayTrades,
      dayNet: dayTrades.reduce((sum, t) => sum + t.net, 0),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface MonthSummary {
  monthNet: number;
  balanceEnd: number;
}

export function monthSummary(
  trades: readonly Trade[],
  year: number,
  month: number,
  startingBalance: number,
): MonthSummary {
  const prefix = dayKey(year, month, 1).slice(0, 7);
  const monthTrades = trades.filter((t) => t.closedAt.slice(0, 7) === prefix);
  const monthNet = monthTrades.reduce((sum, t) => sum + t.net, 0);
  const monthEnd = Date.UTC(year, month + 1, 1);
  const curve = computeMetrics(trades, startingBalance).balanceCurve;
  const reached = curve.filter((p) => +new Date(p.closedAt) < monthEnd);
  return {
    monthNet,
    balanceEnd:
      reached.length > 0 ? reached[reached.length - 1]!.balance : startingBalance,
  };
}
