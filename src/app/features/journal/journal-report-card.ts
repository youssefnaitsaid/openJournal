import { computeBreakdowns } from '../analytics/analytics-metrics';
import type { BreakdownRow } from '../analytics/analytics-metrics';
import { computeMetrics } from '../dashboard/dashboard-metrics';
import type { Trade } from '../trades/trade';

export interface ReportSetup {
  readonly value: string;
  readonly netTotal: number;
}

export interface ReportMistake {
  readonly value: string;
  readonly trades: number;
  readonly netTotal: number;
}

export interface ReportEmotion {
  readonly value: string;
  readonly trades: number;
}

export interface MonthReportCard {
  readonly monthKey: string;
  readonly totalTrades: number;
  readonly netTotal: number;
  readonly winRate: number;
  readonly profitFactor: number;
  readonly bestSetup: ReportSetup | null;
  readonly worstSetup: ReportSetup | null;
  readonly topMistake: ReportMistake | null;
  readonly topEmotionBefore: ReportEmotion | null;
  readonly topEmotionAfter: ReportEmotion | null;
  readonly avgCompliance: number | null;
  readonly scored: number;
  readonly unscored: number;
}

function monthPrefix(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

function signedDollars(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (value > 0) return `+$${abs}`;
  if (value < 0) return `-$${abs}`;
  return `$0.00`;
}

function profitFactorText(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '∞';
}

function frequencyText(entry: { value: string; trades: number } | null): string {
  return entry === null ? '—' : `${entry.value} ×${entry.trades}`;
}

function mostFrequent(rows: readonly BreakdownRow[]): ReportEmotion | null {
  let top: BreakdownRow | null = null;
  for (const row of rows) {
    if (
      top === null ||
      row.trades > top.trades ||
      (row.trades === top.trades && row.value.localeCompare(top.value) < 0)
    ) {
      top = row;
    }
  }
  return top === null ? null : { value: top.value, trades: top.trades };
}

export function formatMonthReportCard(card: MonthReportCard): string {
  const best =
    card.bestSetup === null
      ? '—'
      : `${card.bestSetup.value} (${signedDollars(card.bestSetup.netTotal)})`;
  const worst =
    card.worstSetup === null
      ? '—'
      : `${card.worstSetup.value} (${signedDollars(card.worstSetup.netTotal)})`;
  const mistake = frequencyText(card.topMistake);
  const compliance =
    card.avgCompliance === null
      ? `— (${card.scored}/${card.totalTrades} scored)`
      : `${card.avgCompliance.toFixed(2)}% (${card.scored}/${card.totalTrades} scored)`;
  return [
    `OpenJournal — ${card.monthKey} report card`,
    `Trades: ${card.totalTrades} · Net: ${signedDollars(card.netTotal)} · Win-rate: ${card.winRate.toFixed(2)}% · PF: ${profitFactorText(card.profitFactor)}`,
    `Best Setup: ${best} · Worst Setup: ${worst}`,
    `Top Mistake: ${mistake} · Compliance: ${compliance}`,
    `Emotion-before: ${frequencyText(card.topEmotionBefore)} · Emotion-after: ${frequencyText(card.topEmotionAfter)} · Unscored: ${card.unscored}`,
  ].join('\n');
}

export function computeMonthReportCard(
  trades: readonly Trade[],
  year: number,
  month: number,
): MonthReportCard {
  const monthKey = monthPrefix(year, month);
  const monthTrades = trades.filter((t) => t.closedAt.slice(0, 7) === monthKey);
  const metrics = computeMetrics(monthTrades, 0);

  const setupRows = computeBreakdowns(monthTrades, 'setup');
  const bestSetup =
    setupRows.length > 0
      ? {
          value: setupRows[0]!.value,
          netTotal: setupRows[0]!.netTotal,
        }
      : null;
  const worstSetup =
    setupRows.length > 1
      ? {
          value: setupRows[setupRows.length - 1]!.value,
          netTotal: setupRows[setupRows.length - 1]!.netTotal,
        }
      : null;

  const mistakeRows = [...computeBreakdowns(monthTrades, 'mistake')].sort(
    (a, b) =>
      b.trades - a.trades ||
      b.netTotal - a.netTotal ||
      a.value.localeCompare(b.value),
  );
  const topMistake =
    mistakeRows.length > 0
      ? {
          value: mistakeRows[0]!.value,
          trades: mistakeRows[0]!.trades,
          netTotal: mistakeRows[0]!.netTotal,
        }
      : null;

  const topEmotionBefore = mostFrequent(
    computeBreakdowns(monthTrades, 'emotionBefore'),
  );
  const topEmotionAfter = mostFrequent(
    computeBreakdowns(monthTrades, 'emotionAfter'),
  );

  let complianceSum = 0;
  let scored = 0;
  for (const t of monthTrades) {
    if (t.compliance !== null && t.compliance !== undefined) {
      complianceSum += t.compliance;
      scored += 1;
    }
  }

  return {
    monthKey,
    totalTrades: monthTrades.length,
    netTotal: metrics.netTotal,
    winRate: metrics.winRate,
    profitFactor: metrics.profitFactor,
    bestSetup,
    worstSetup,
    topMistake,
    topEmotionBefore,
    topEmotionAfter,
    avgCompliance: scored > 0 ? complianceSum / scored : null,
    scored,
    unscored: monthTrades.length - scored,
  };
}
