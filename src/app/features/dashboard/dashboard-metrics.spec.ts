import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import { computeMetrics } from './dashboard-metrics';

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
});
