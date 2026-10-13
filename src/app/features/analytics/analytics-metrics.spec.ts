import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import { computeRMetrics } from './analytics-metrics';

const PLUS_2R = () =>
  tradeFixture({
    asset: 'PLUS-2R',
    quantity: 10,
    entryPrice: 100,
    exitPrice: 120,
    riskedAmount: 100,
    closedAt: '2026-10-01T14:30:00.000Z',
  });
const MINUS_1R = () =>
  tradeFixture({
    asset: 'MINUS-1R',
    quantity: 10,
    entryPrice: 100,
    exitPrice: 90,
    riskedAmount: 100,
    closedAt: '2026-10-02T14:30:00.000Z',
  });
const ZERO_NOSTOP = () =>
  tradeFixture({
    asset: 'ZERO-NOSTOP',
    quantity: 10,
    entryPrice: 100,
    exitPrice: 105,
    closedAt: '2026-10-03T14:30:00.000Z',
  });

describe('computeRMetrics', () => {
  it('reads all zeros on an empty journal', () => {
    const m = computeRMetrics([]);
    expect(m.totalTrades).toBe(0);
    expect(m.riskedCount).toBe(0);
    expect(m.rExpectancy).toBe(0);
    expect(m.medianR).toBe(0);
    expect(m.rSum).toBe(0);
    expect(m.riskedTotal).toBe(0);
    expect(m.netTotal).toBe(0);
    expect(m.bySetup).toEqual([]);
  });

  it('averages stored R over all Trades with zero-risk 0R included', () => {
    const m = computeRMetrics([PLUS_2R(), MINUS_1R(), ZERO_NOSTOP()]);
    expect(m.totalTrades).toBe(3);
    expect(m.riskedCount).toBe(2);
    expect(m.rSum).toBe(1);
    expect(m.rExpectancy).toBeCloseTo(1 / 3, 10);
    expect(m.medianR).toBe(0);
    expect(m.riskedTotal).toBe(200);
    expect(m.netTotal).toBe(150);
  });

  it('medians an even count as the mean of the two middles', () => {
    const m = computeRMetrics([PLUS_2R(), ZERO_NOSTOP()]);
    expect(m.medianR).toBe(1);
  });

  it('groups R by Setup with count, average, and total sorted by average desc', () => {
    const m = computeRMetrics([
      PLUS_2R(),
      tradeFixture({
        asset: 'PLUS-4R',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 50,
        setup: 'Breakout',
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
      tradeFixture({
        asset: 'MINUS-1R',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        setup: 'Pullback',
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    ]);
    expect(m.bySetup).toEqual([
      { setup: 'Breakout', trades: 2, avgR: 3, totalR: 6 },
      { setup: 'Pullback', trades: 1, avgR: -1, totalR: -1 },
    ]);
  });

  it('counts a risked Breakeven as 0R in the denominator', () => {
    const m = computeRMetrics([
      PLUS_2R(),
      tradeFixture({
        asset: 'FLAT-RISKED',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 100,
        riskedAmount: 50,
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    ]);
    expect(m.rSum).toBe(2);
    expect(m.rExpectancy).toBe(1);
    expect(m.medianR).toBe(1);
    expect(m.riskedCount).toBe(2);
  });
});
