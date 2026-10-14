import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import {
  computeBreakdowns,
  computeComplianceCorrelation,
  computeRMetrics,
  computeTimePatterns,
} from './analytics-metrics';

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
      { value: 'Breakout', trades: 2, netTotal: 400, winRate: 100, avgR: 3, avgCompliance: null },
      { value: 'Pullback', trades: 1, netTotal: -100, winRate: 0, avgR: -1, avgCompliance: null },
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
      { value: 'Breakout', trades: 2, netTotal: 200, winRate: 100, avgR: 1, avgCompliance: null },
      { value: 'Pullback', trades: 1, netTotal: 0, winRate: 0, avgR: 0, avgCompliance: null },
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
      { value: 'A', trades: 1, netTotal: 200, winRate: 100, avgR: 2, avgCompliance: null },
      { value: 'B', trades: 1, netTotal: 100, winRate: 100, avgR: 1, avgCompliance: null },
      { value: '(Unspecified)', trades: 1, netTotal: 0, winRate: 0, avgR: 0, avgCompliance: null },
      { value: 'D', trades: 1, netTotal: -100, winRate: 0, avgR: -1, avgCompliance: null },
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

  it('groups by Tag with multi-count, (Unspecified), and shared row math', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({
          asset: 'FOMC-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          tags: ['FOMC', 'earnings'],
          closedAt: '2026-10-01T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'EARN-LOSS',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          tags: ['earnings'],
          closedAt: '2026-10-02T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'PLAIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          closedAt: '2026-10-03T14:30:00.000Z',
        }),
      ],
      'tag',
    );
    expect(rows).toEqual([
      { value: 'FOMC', trades: 1, netTotal: 200, winRate: 100, avgR: 2, avgCompliance: null },
      { value: 'earnings', trades: 2, netTotal: 100, winRate: 50, avgR: 0.5, avgCompliance: null },
      { value: '(Unspecified)', trades: 1, netTotal: 0, winRate: 0, avgR: 0, avgCompliance: null },
    ]);
  });
});

describe('computeBreakdowns compliance', () => {
  it('reads null avg compliance when no Trade in the group is scored', () => {
    const rows = computeBreakdowns([PLUS_2R()], 'setup');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.avgCompliance).toBeNull();
  });

  it('averages compliance over scored Trades only within each group', () => {
    const rows = computeBreakdowns(
      [
        tradeFixture({
          asset: 'FULL-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          setup: 'Breakout',
          rules: [
            { text: 'a', followed: true },
            { text: 'b', followed: true },
          ],
          closedAt: '2026-10-01T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'HALF-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 110,
          setup: 'Breakout',
          rules: [
            { text: 'a', followed: true },
            { text: 'b', followed: false },
          ],
          closedAt: '2026-10-02T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'UNSCORED',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 110,
          setup: 'Breakout',
          closedAt: '2026-10-03T14:30:00.000Z',
        }),
      ],
      'setup',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.trades).toBe(3);
    expect(rows[0]!.avgCompliance).toBeCloseTo(75, 10);
  });
});

describe('computeComplianceCorrelation', () => {
  it('reads empty buckets on an empty journal', () => {
    const c = computeComplianceCorrelation([]);
    expect(c).toEqual({
      full: { trades: 0, netTotal: 0, winRate: 0 },
      partial: { trades: 0, netTotal: 0, winRate: 0 },
      scored: 0,
      unscored: 0,
    });
  });

  it('splits scored Trades into full versus partial with shared win-rate math', () => {
    const c = computeComplianceCorrelation([
      tradeFixture({
        asset: 'FULL-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: true },
        ],
        closedAt: '2026-10-01T14:30:00.000Z',
      }),
      tradeFixture({
        asset: 'HALF-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: false },
        ],
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
      tradeFixture({
        asset: 'FULL-FLAT',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 100,
        fees: 0,
        rules: [{ text: 'a', followed: true }],
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
      tradeFixture({
        asset: 'UNSCORED-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        closedAt: '2026-10-04T14:30:00.000Z',
      }),
    ]);
    expect(c.scored).toBe(3);
    expect(c.unscored).toBe(1);
    expect(c.full.trades).toBe(2);
    expect(c.full.netTotal).toBe(200);
    expect(c.full.winRate).toBe(100);
    expect(c.partial.trades).toBe(1);
    expect(c.partial.netTotal).toBe(-100);
    expect(c.partial.winRate).toBe(0);
  });
});

describe('computeTimePatterns', () => {
  it('reads empty on an empty journal', () => {
    expect(computeTimePatterns([], 'weekday')).toEqual([]);
    expect(computeTimePatterns([], 'hour')).toEqual([]);
    expect(computeTimePatterns([], 'hold')).toEqual([]);
  });

  it('buckets weekday by UTC close in Monday-first chronological order with full fixed rows', () => {
    const rows = computeTimePatterns(
      [
        tradeFixture({
          asset: 'MON-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          closedAt: '2026-10-05T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'MON-LOSS',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          closedAt: '2026-10-05T16:30:00.000Z',
        }),
        tradeFixture({
          asset: 'TUE-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 110,
          closedAt: '2026-10-06T01:00:00.000Z',
        }),
      ],
      'weekday',
    );
    expect(rows.map((r) => r.value)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
    expect(rows[0]).toEqual({
      value: 'Monday',
      trades: 2,
      netTotal: 100,
      winRate: 50,
      avgR: 0.5,
      avgCompliance: null,
    });
    expect(rows[1]).toEqual({
      value: 'Tuesday',
      trades: 1,
      netTotal: 100,
      winRate: 100,
      avgR: 0,
      avgCompliance: null,
    });
    expect(rows[2]).toEqual({
      value: 'Wednesday',
      trades: 0,
      netTotal: 0,
      winRate: 0,
      avgR: 0,
      avgCompliance: null,
    });
  });

  it('buckets hour by UTC close hour in chronological order with 24 fixed rows', () => {
    const rows = computeTimePatterns(
      [
        tradeFixture({
          asset: 'H14-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          closedAt: '2026-10-06T14:20:00.000Z',
        }),
        tradeFixture({
          asset: 'H14-LOSS',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          closedAt: '2026-10-06T14:45:00.000Z',
        }),
        tradeFixture({
          asset: 'H09-BE',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          closedAt: '2026-10-06T09:05:00.000Z',
        }),
      ],
      'hour',
    );
    expect(rows).toHaveLength(24);
    expect(rows[0]!.value).toBe('00:00-00:59');
    expect(rows[23]!.value).toBe('23:00-23:59');
    expect(rows[9]).toEqual({
      value: '09:00-09:59',
      trades: 1,
      netTotal: 0,
      winRate: 0,
      avgR: 0,
      avgCompliance: null,
    });
    expect(rows[14]).toEqual({
      value: '14:00-14:59',
      trades: 2,
      netTotal: 100,
      winRate: 50,
      avgR: 0.5,
      avgCompliance: null,
    });
  });

  it('buckets Hold Duration with upper-bucket-wins edges and negatives reading Intraday', () => {
    const rows = computeTimePatterns(
      [
        tradeFixture({
          asset: 'INTRA-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          openedAt: '2026-10-05T10:00:00.000Z',
          closedAt: '2026-10-05T15:00:00.000Z',
        }),
        tradeFixture({
          asset: 'EDGE-24',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          openedAt: '2026-10-05T10:00:00.000Z',
          closedAt: '2026-10-06T10:00:00.000Z',
        }),
        tradeFixture({
          asset: 'SWING-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 110,
          openedAt: '2026-10-01T10:00:00.000Z',
          closedAt: '2026-10-06T10:00:01.000Z',
        }),
        tradeFixture({
          asset: 'EDGE-72',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 105,
          openedAt: '2026-10-03T10:00:00.000Z',
          closedAt: '2026-10-06T10:00:00.000Z',
        }),
        tradeFixture({
          asset: 'NEG-FLAT',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          openedAt: '2026-10-06T12:00:00.000Z',
          closedAt: '2026-10-06T10:00:00.000Z',
        }),
      ],
      'hold',
    );
    expect(rows.map((r) => r.value)).toEqual([
      'Intraday (<24h)',
      '1-3 days',
      'Swing (>3d)',
    ]);
    expect(rows[0]).toEqual({
      value: 'Intraday (<24h)',
      trades: 2,
      netTotal: 200,
      winRate: 100,
      avgR: 1,
      avgCompliance: null,
    });
    expect(rows[1]).toEqual({
      value: '1-3 days',
      trades: 1,
      netTotal: -100,
      winRate: 0,
      avgR: -1,
      avgCompliance: null,
    });
    expect(rows[2]).toEqual({
      value: 'Swing (>3d)',
      trades: 2,
      netTotal: 150,
      winRate: 100,
      avgR: 0,
      avgCompliance: null,
    });
  });

  it('shares breakdown semantics: Breakevens out of win-rate, scored-only Compliance', () => {
    const rows = computeTimePatterns(
      [
        tradeFixture({
          asset: 'FULL-WIN',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 120,
          riskedAmount: 100,
          rules: [
            { text: 'a', followed: true },
            { text: 'b', followed: true },
          ],
          closedAt: '2026-10-05T14:30:00.000Z',
        }),
        tradeFixture({
          asset: 'HALF-LOSS',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 90,
          riskedAmount: 100,
          rules: [
            { text: 'a', followed: true },
            { text: 'b', followed: false },
          ],
          closedAt: '2026-10-05T16:30:00.000Z',
        }),
        tradeFixture({
          asset: 'BE-FLAT',
          quantity: 10,
          entryPrice: 100,
          exitPrice: 100,
          closedAt: '2026-10-05T18:30:00.000Z',
        }),
      ],
      'weekday',
    );
    const monday = rows[0]!;
    expect(monday.trades).toBe(3);
    expect(monday.netTotal).toBe(100);
    expect(monday.winRate).toBeCloseTo(50, 10);
    expect(monday.avgR).toBeCloseTo(1 / 3, 10);
    expect(monday.avgCompliance).toBe(75);
  });
});
