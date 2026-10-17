import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import {
  computeKpiBand,
  computeMetrics,
  formatGuardStatus,
  formatProfitFactor,
  formatStreaks,
} from './dashboard-metrics';
import type { GuardStatusInput } from './dashboard-metrics';

const WIN_A = () =>
  tradeFixture({
    asset: 'WIN-A',
    quantity: 10,
    entryPrice: 100,
    exitPrice: 110,
    fees: 1,
    closedAt: '2026-10-01T14:30:00.000Z',
  });
const WIN_B = () =>
  tradeFixture({
    asset: 'WIN-B',
    side: 'Short',
    quantity: 10,
    entryPrice: 50,
    exitPrice: 45,
    closedAt: '2026-10-01T15:30:00.000Z',
  });
const LOSS = () =>
  tradeFixture({
    asset: 'LOSS',
    quantity: 10,
    entryPrice: 100,
    exitPrice: 90,
    fees: 5,
    closedAt: '2026-10-02T14:30:00.000Z',
  });
const FLAT = () =>
  tradeFixture({ asset: 'FLAT', quantity: 10, closedAt: '2026-10-03T14:30:00.000Z' });

describe('computeMetrics', () => {
  it('is all zeros on an empty journal', () => {
    const m = computeMetrics([], 10000);
    expect(m.totalTrades).toBe(0);
    expect(m.wins).toBe(0);
    expect(m.losses).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.netTotal).toBe(0);
    expect(m.avgWin).toBe(0);
    expect(m.avgLoss).toBe(0);
    expect(m.profitFactor).toBe(0);
    expect(m.dayWinRate).toBe(0);
    expect(m.balanceCurve).toEqual([]);
    expect(m.recent).toEqual([]);
  });

  it('counts only closed Trades with Breakeven excluded from Win Rate', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.totalTrades).toBe(4);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(1);
    expect(m.winRate).toBeCloseTo((2 / 3) * 100, 10);
  });

  it('sums Net P&L after Fees with Short and multiplier flowing through', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.netTotal).toBe(44);
    expect(m.avgWin).toBe(74.5);
    expect(m.avgLoss).toBe(-105);
    expect(m.profitFactor).toBeCloseTo(149 / 105, 10);
  });

  it('uses Infinity with wins but no losses, and zero with no wins', () => {
    expect(computeMetrics([WIN_A()], 0).profitFactor).toBe(Infinity);
    expect(computeMetrics([FLAT()], 0).profitFactor).toBe(0);
    expect(computeMetrics([FLAT()], 0).winRate).toBe(0);
  });

  it('steps Account Balance by close-time order from the starting balance', () => {
    const m = computeMetrics([LOSS(), WIN_B(), FLAT(), WIN_A()], 10000);
    expect(m.balanceCurve.map((p) => p.balance)).toEqual([
      10000, 10099, 10149, 10044, 10044,
    ]);
  });

  it('rates winning days over nonzero days', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.dayWinRate).toBe(50);
  });

  it('returns Recent Trades newest-first with a limit', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000, 2);
    expect(m.recent.map((t) => t.asset)).toEqual(['FLAT', 'LOSS']);
  });

  it('reads zero drawdown on an empty journal', () => {
    const m = computeMetrics([], 10000);
    expect(m.maxDrawdown).toBe(0);
    expect(m.maxDrawdownPct).toBe(0);
  });

  it('measures peak-to-trough drawdown off the balance curve', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.maxDrawdown).toBe(105);
    expect(m.maxDrawdownPct).toBeCloseTo((105 / 10149) * 100, 10);
  });

  it('reads zero streaks on an empty journal', () => {
    const m = computeMetrics([], 10000);
    expect(m.currentWinStreak).toBe(0);
    expect(m.currentLossStreak).toBe(0);
    expect(m.longestWinStreak).toBe(0);
    expect(m.longestLossStreak).toBe(0);
    expect(m.expectancy).toBe(0);
  });

  it('tracks current and longest streaks with Breakeven breaking both', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.currentWinStreak).toBe(0);
    expect(m.currentLossStreak).toBe(0);
    expect(m.longestWinStreak).toBe(2);
    expect(m.longestLossStreak).toBe(1);
  });

  it('tracks a trailing run as the current streak', () => {
    const earlyLoss = tradeFixture({
      asset: 'LOSS',
      quantity: 10,
      entryPrice: 100,
      exitPrice: 90,
      fees: 5,
      closedAt: '2026-10-01T14:30:00.000Z',
    });
    const lateWinA = tradeFixture({
      asset: 'WIN-A',
      quantity: 10,
      entryPrice: 100,
      exitPrice: 110,
      fees: 1,
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const lateWinB = tradeFixture({
      asset: 'WIN-B',
      side: 'Short',
      quantity: 10,
      entryPrice: 50,
      exitPrice: 45,
      closedAt: '2026-10-03T14:30:00.000Z',
    });
    const m = computeMetrics([lateWinB, lateWinA, earlyLoss], 10000);
    expect(m.currentWinStreak).toBe(2);
    expect(m.currentLossStreak).toBe(0);
    expect(m.longestWinStreak).toBe(2);
    expect(m.longestLossStreak).toBe(1);
  });

  it('averages Net P&L over all Trades including Breakeven', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS(), FLAT()], 10000);
    expect(m.expectancy).toBe(11);
  });

  it('reads zero drawdown when the curve never draws down', () => {
    const m = computeMetrics([WIN_A(), WIN_B()], 10000);
    expect(m.maxDrawdown).toBe(0);
    expect(m.maxDrawdownPct).toBe(0);
  });

  it('reads 0% drawdown when the peak balance is zero', () => {
    const m = computeMetrics([LOSS()], 0);
    expect(m.maxDrawdown).toBe(105);
    expect(m.maxDrawdownPct).toBe(0);
  });
});

describe('computeKpiBand', () => {
  it('shows the same derived numbers the tile strip showed, plus current balance', () => {
    const m = computeMetrics([WIN_A(), LOSS()], 10000);
    const band = computeKpiBand(m, 10000);
    const asMap = new Map(band.map((l) => [l.label, l.value]));
    expect(asMap.get('Trade win %')).toBe('50.00');
    expect(asMap.get('Profit factor')).toBe('0.94');
    expect(asMap.get('Day win %')).toBe('50.00');
    expect(asMap.get('Avg win / loss')).toBe('99 / -105');
    expect(asMap.get('Total trades')).toBe('2');
    expect(asMap.get('Max drawdown')).toBe('$105 · 1.04%');
    expect(asMap.get('Streaks')).toBe('W0 · L1 / Best W1 · L1');
    expect(asMap.get('Expectancy / Trade')).toBe('-$3.00');
    expect(asMap.get('Current balance')).toBe('9994');
  });

  it('renders ∞ for an infinite profit factor', () => {
    const m = computeMetrics([WIN_A()], 10000);
    const band = computeKpiBand(m, 10000);
    expect(new Map(band.map((l) => [l.label, l.value])).get('Profit factor')).toBe(
      '∞',
    );
  });
});

describe('pure formatters', () => {
  it('formatProfitFactor keeps ∞ only for a non-finite value', () => {
    expect(formatProfitFactor(Number.POSITIVE_INFINITY)).toBe('∞');
    expect(formatProfitFactor(0.94)).toBe('0.94');
  });

  it('formatStreaks names current and best runs', () => {
    const m = computeMetrics([WIN_A(), WIN_B(), LOSS()], 10000);
    expect(formatStreaks(m)).toBe('W0 · L1 / Best W2 · L1');
  });

  it('formatGuardStatus lists only configured limits and appends breaches', () => {
    const input: GuardStatusInput = {
      dailyLoss: { spent: 60, limit: 200 },
      dailyTrades: { count: 2, limit: null },
      dailyStop: null,
      weeklyLoss: { spent: 120, limit: 500 },
      weeklyTrades: { count: 5, limit: 10 },
      breaches: ['Weekly loss Guard'],
    };
    expect(formatGuardStatus(input)).toBe(
      'Daily loss $60 / $200 · Weekly loss $120 / $500 · Weekly trades 5 / 10 · Breached: Weekly loss Guard',
    );
  });

  it('formatGuardStatus reports inside-all when nothing is breached', () => {
    const input: GuardStatusInput = {
      dailyLoss: { spent: 0, limit: 200 },
      dailyTrades: { count: 1, limit: 3 },
      dailyStop: '15:30',
      weeklyLoss: { spent: 0, limit: null },
      weeklyTrades: { count: 1, limit: null },
      breaches: [],
    };
    expect(formatGuardStatus(input)).toBe(
      'Daily loss $0 / $200 · Daily trades 1 / 3 · Stop 15:30 · Inside all Guards',
    );
  });
});
