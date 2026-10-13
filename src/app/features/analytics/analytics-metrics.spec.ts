import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import { computeBreakdowns, computeRMetrics } from './analytics-metrics';

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

describe('computeBreakdowns', () => {
  it('reads empty on an empty journal', () => {
    expect(computeBreakdowns([], 'setup')).toEqual([]);
  });

  it('groups by Setup with count, Net sum, win-rate, and avg R sorted by Net desc', () => {
    const rows = computeBreakdowns(
      [
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
      ],
      'setup',
    );
    expect(rows).toEqual([
      { value: 'Breakout', trades: 2, netTotal: 400, winRate: 100, avgR: 3 },
      { value: 'Pullback', trades: 1, netTotal: -100, winRate: 0, avgR: -1 },
    ]);
  });

  it('excludes Breakevens from win-rate and reads 0 on Breakeven-only groups', () => {
    const rows = computeBreakdowns(
      [
        PLUS_2R(),
        tradeFixture({
          asset: 'FLAT',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          fees: 0,
          setup: 'Breakout',
          closedAt: '2026-10-02T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'FLAT-PULL',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          fees: 0,
          setup: 'Pullback',
          closedAt: '2026-10-03T14:30:00.000Z',
        }),
      ],
      'setup',
    );
    expect(rows).toEqual([
      { value: 'Breakout', trades: 2, netTotal: 200, winRate: 100, avgR: 1 },
      { value: 'Pullback', trades: 1, netTotal: 0, winRate: 0, avgR: 0 },
    ]);
  });

  it('includes zero-risk 0Rs in avg R denominator', () => {
    const rows = computeBreakdowns([PLUS_2R(), ZERO_NOSTOP()], 'setup');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.trades).toBe(2);
    expect(rows[0]!.avgR).toBeCloseTo(1, 10);
  });

  it('groups blank values into a single (Unspecified) row', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({ asset: '', closedAt: '2026-10-01T14:30:00.000Z' }),
        tradeFixture({ asset: '   ', closedAt: '2026-10-02T14:30:00.000Z' }),
        PLUS_2R(),
      ],
      'asset',
    );
    expect(rows.map((r) => r.value).sort()).toEqual(
      ['(Unspecified)', 'PLUS-2R'].sort(),
    );
    const unspecified = rows.find((r) => r.value === '(Unspecified)')!;
    expect(unspecified.trades).toBe(2);
  });

  it('groups Asset exactly and case-sensitively', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({ asset: 'AAPL', closedAt: '2026-10-01T14:30:00.000Z' }),
        tradeFixture({ asset: 'aapl', closedAt: '2026-10-02T14:30:00.000Z' }),
        tradeFixture({ asset: 'AAPL ', closedAt: '2026-10-03T14:30:00.000Z' }),
      ],
      'asset',
    );
    expect(rows).toHaveLength(3);
  });

  it('breaks Net ties alphabetically', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({ asset: 'B', quantity: 1, entryPrice: 100, exitPrice: 100 }),
        tradeFixture({ asset: 'A', quantity: 1, entryPrice: 100, exitPrice: 100 }),
      ],
      'asset',
    );
    expect(rows.map((r) => r.value)).toEqual(['A', 'B']);
  });

  it('caps at 20 rows and aggregates the tail into Other without averaging averages', () => {
    const trades = Array.from({ length: 22 }, (_, i) =>
      tradeFixture({
        asset: `SYM-${String(i).padStart(2, '0')}`,
        quantity: 1,
        entryPrice: 100,
        exitPrice: 100 + i,
        riskedAmount: 10,
        closedAt: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T14:30:00.000Z`,
      }),
    );
    const rows = computeBreakdowns(trades, 'asset');
    expect(rows).toHaveLength(21);
    expect(rows[0]!.value).toBe('SYM-21');
    const other = rows[rows.length - 1]!;
    expect(other.value).toBe('Other (2)');
    expect(other.trades).toBe(2);
    expect(other.netTotal).toBe(1);
    expect(other.winRate).toBe(100);
    expect(other.avgR).toBeCloseTo(0.05, 10);
  });

  it('extracts all eight dimensions from stored Trade fields', () => {
    const base = tradeFixture({
      asset: 'AAPL',
      market: 'Stocks',
      side: 'Long',
      setup: 'Breakout',
      emotionBefore: 'Calm',
      emotionAfter: 'FOMO',
      mistake: 'Moved-stop',
      grade: 'B',
    });
    const bySide = computeBreakdowns([base], 'side');
    expect(bySide[0]!.value).toBe('Long');
    expect(computeBreakdowns([base], 'market')[0]!.value).toBe('Stocks');
    expect(computeBreakdowns([base], 'emotionBefore')[0]!.value).toBe('Calm');
    expect(computeBreakdowns([base], 'emotionAfter')[0]!.value).toBe('FOMO');
    expect(computeBreakdowns([base], 'mistake')[0]!.value).toBe('Moved-stop');
    expect(computeBreakdowns([base], 'asset')[0]!.value).toBe('AAPL');
    expect(computeBreakdowns([base], 'setup')[0]!.value).toBe('Breakout');
    expect(computeBreakdowns([base], 'grade')[0]!.value).toBe('B');
  });

  it('groups by Grade with count, Net sum, win-rate, and avg R sorted by Net desc', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({
          asset: 'A-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          grade: 'A',
          closedAt: '2026-10-01T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'B-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 110,
          riskedAmount: 100,
          grade: 'B',
          closedAt: '2026-10-02T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'D-LOSS',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          grade: 'D',
          closedAt: '2026-10-03T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'FLAT',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          fees: 0,
          closedAt: '2026-10-04T14:30:00.000Z',
        }),
      ],
      'grade',
    );
    expect(rows).toEqual([
      { value: 'A', trades: 1, netTotal: 200, winRate: 100, avgR: 2 },
      { value: 'B', trades: 1, netTotal: 100, winRate: 100, avgR: 1 },
      { value: '(Unspecified)', trades: 1, netTotal: 0, winRate: 0, avgR: 0 },
      { value: 'D', trades: 1, netTotal: -100, winRate: 0, avgR: -1 },
    ]);
  });

  it('collapses blank Grades into a single (Unspecified) row', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({ asset: 'G1', closedAt: '2026-10-01T14:30:00.000Z' }),
        tradeFixture({
          asset: 'G2',
          grade: '',
          closedAt: '2026-10-02T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'G3',
          grade: 'C',
          closedAt: '2026-10-03T14:30:00.000Z',
        }),
      ],
      'grade',
    );
    expect(rows.map((r) => r.value).sort()).toEqual(
      ['(Unspecified)', 'C'].sort(),
    );
    const unspecified = rows.find((r) => r.value === '(Unspecified)')!;
    expect(unspecified.trades).toBe(2);
  });

  it('extracts Grade from the stored Trade field', () => {
    const base = tradeFixture({ grade: 'B' });
    expect(computeBreakdowns([base], 'grade')[0]!.value).toBe('B');
  });
});
