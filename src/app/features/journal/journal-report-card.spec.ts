import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import {
  computeMonthReportCard,
  formatMonthReportCard,
  type MonthReportCard,
} from './journal-report-card';

describe('computeMonthReportCard core', () => {
  it('reads an empty month as zeros with null gaps', () => {
    const card = computeMonthReportCard([], 2026, 9);
    expect(card).toEqual({
      monthKey: '2026-10',
      totalTrades: 0,
      netTotal: 0,
      winRate: 0,
      profitFactor: 0,
      bestSetup: null,
      worstSetup: null,
      topMistake: null,
      avgCompliance: null,
      scored: 0,
      unscored: 0,
    });
  });

  it('keys the month by UTC close date, ignoring other months', () => {
    const oct = tradeFixture({ asset: 'OCT', exitPrice: 110, fees: 1 });
    const nov = tradeFixture({
      asset: 'NOV',
      exitPrice: 110,
      fees: 1,
      closedAt: '2026-11-01T14:30:00.000Z',
    });
    const card = computeMonthReportCard([oct, nov], 2026, 9);
    expect(card.monthKey).toBe('2026-10');
    expect(card.totalTrades).toBe(1);
    expect(card.netTotal).toBe(99);
  });

  it('derives Net, Win-rate, and Profit Factor like the shared seam', () => {
    const winA = tradeFixture({ asset: 'A', exitPrice: 110, fees: 1 });
    const winB = tradeFixture({
      asset: 'B',
      exitPrice: 120,
      fees: 0,
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const loss = tradeFixture({
      asset: 'C',
      exitPrice: 90,
      fees: 5,
      closedAt: '2026-10-03T14:30:00.000Z',
    });
    const flat = tradeFixture({
      asset: 'D',
      exitPrice: 100,
      fees: 0,
      closedAt: '2026-10-04T14:30:00.000Z',
    });
    const card = computeMonthReportCard([winA, winB, loss, flat], 2026, 9);
    expect(card.totalTrades).toBe(4);
    expect(card.netTotal).toBe(99 + 200 - 105 + 0);
    expect(card.winRate).toBeCloseTo((2 / 3) * 100, 10);
    expect(card.profitFactor).toBeCloseTo(299 / 105, 10);
  });

  it('reads Profit Factor Infinity with wins but no losses, 0 with no wins', () => {
    const win = tradeFixture({ asset: 'W', exitPrice: 110, fees: 1 });
    expect(computeMonthReportCard([win], 2026, 9).profitFactor).toBe(Infinity);
    const flat = tradeFixture({ asset: 'F', exitPrice: 100, fees: 0 });
    const breakevenOnly = computeMonthReportCard([flat], 2026, 9);
    expect(breakevenOnly.profitFactor).toBe(0);
    expect(breakevenOnly.winRate).toBe(0);
  });
});

describe('computeMonthReportCard rankings', () => {
  it('reads best/worst Setup by Net sum with alphabetical tiebreak', () => {
    const breakout = tradeFixture({ asset: 'A', exitPrice: 110, fees: 1 });
    const pullback = tradeFixture({
      asset: 'B',
      setup: 'Pullback',
      exitPrice: 90,
      fees: 5,
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const card = computeMonthReportCard([breakout, pullback], 2026, 9);
    expect(card.bestSetup).toEqual({ value: 'Breakout', netTotal: 99 });
    expect(card.worstSetup).toEqual({ value: 'Pullback', netTotal: -105 });
  });

  it('breaks Setup Net ties alphabetically', () => {
    const zebra = tradeFixture({
      asset: 'Z',
      setup: 'Zebra',
      exitPrice: 110,
      fees: 1,
    });
    const alpha = tradeFixture({
      asset: 'A',
      setup: 'Alpha',
      exitPrice: 110,
      fees: 1,
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const card = computeMonthReportCard([zebra, alpha], 2026, 9);
    expect(card.bestSetup?.value).toBe('Alpha');
    expect(card.worstSetup?.value).toBe('Zebra');
  });

  it('collapses blank Setups to (Unspecified) and singles to best-only', () => {
    const blank = tradeFixture({ asset: 'U', setup: '', exitPrice: 110, fees: 1 });
    const single = computeMonthReportCard([blank], 2026, 9);
    expect(single.bestSetup).toEqual({ value: '(Unspecified)', netTotal: 99 });
    expect(single.worstSetup).toBeNull();
  });

  it('reads the most frequent Mistake with its count', () => {
    const trades = [
      tradeFixture({ asset: 'A', mistake: 'Moved-stop', exitPrice: 110, fees: 1 }),
      tradeFixture({
        asset: 'B',
        mistake: 'Moved-stop',
        exitPrice: 90,
        fees: 5,
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
      tradeFixture({
        asset: 'C',
        mistake: 'Left-early',
        exitPrice: 110,
        fees: 1,
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    ];
    const card = computeMonthReportCard(trades, 2026, 9);
    expect(card.topMistake).toEqual({
      value: 'Moved-stop',
      trades: 2,
      netTotal: -6,
    });
  });

  it('breaks Mistake count ties by Net then alphabetically', () => {
    const bleeder = tradeFixture({
      asset: 'B',
      mistake: 'Zebra-slip',
      exitPrice: 90,
      fees: 5,
    });
    const printer = tradeFixture({
      asset: 'A',
      mistake: 'Alpha-slip',
      exitPrice: 90,
      fees: 5,
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const card = computeMonthReportCard([bleeder, printer], 2026, 9);
    expect(card.topMistake?.value).toBe('Alpha-slip');
  });

  it('collapses blank Mistakes to (Unspecified)', () => {
    const blank = tradeFixture({ asset: 'U', mistake: '', exitPrice: 110, fees: 1 });
    expect(computeMonthReportCard([blank], 2026, 9).topMistake).toEqual({
      value: '(Unspecified)',
      trades: 1,
      netTotal: 99,
    });
  });
});

describe('computeMonthReportCard compliance', () => {
  it('averages Compliance over scored Trades only with scored count', () => {
    const full = tradeFixture({
      asset: 'F',
      exitPrice: 110,
      fees: 1,
      rules: [
        { text: 'risk ok', followed: true },
        { text: 'trend only', followed: true },
      ],
    });
    const partial = tradeFixture({
      asset: 'P',
      exitPrice: 110,
      fees: 1,
      rules: [
        { text: 'risk ok', followed: true },
        { text: 'trend only', followed: false },
      ],
      closedAt: '2026-10-02T14:30:00.000Z',
    });
    const unscored = tradeFixture({
      asset: 'U',
      exitPrice: 110,
      fees: 1,
      closedAt: '2026-10-03T14:30:00.000Z',
    });
    const card = computeMonthReportCard([full, partial, unscored], 2026, 9);
    expect(card.avgCompliance).toBeCloseTo(75, 10);
    expect(card.scored).toBe(2);
    expect(card.unscored).toBe(1);
  });

  it('reads null Compliance with zero scored when nothing was touched', () => {
    const plain = tradeFixture({ asset: 'P', exitPrice: 110, fees: 1 });
    const card = computeMonthReportCard([plain], 2026, 9);
    expect(card.avgCompliance).toBeNull();
    expect(card.scored).toBe(0);
  });

  it('reads all-skipped as 0 and all-followed as 100', () => {
    const skipped = tradeFixture({
      asset: 'S',
      exitPrice: 110,
      fees: 1,
      rules: [{ text: 'risk ok', followed: false }],
    });
    expect(computeMonthReportCard([skipped], 2026, 9).avgCompliance).toBe(0);
    const followed = tradeFixture({
      asset: 'G',
      exitPrice: 110,
      fees: 1,
      rules: [{ text: 'risk ok', followed: true }],
    });
    expect(computeMonthReportCard([followed], 2026, 9).avgCompliance).toBe(100);
  });
});

describe('formatMonthReportCard', () => {
  const CARD: MonthReportCard = {
    monthKey: '2026-10',
    totalTrades: 12,
    netTotal: 340,
    winRate: 58.333333333333336,
    profitFactor: 1.8,
    bestSetup: { value: 'Breakout', netTotal: 500 },
    worstSetup: { value: 'Chop', netTotal: -210 },
    topMistake: { value: 'Moved-stop', trades: 3, netTotal: -50 },
    avgCompliance: 75,
    scored: 8,
    unscored: 4,
  };

  it('writes the fixed four-line template with Dashboard/Analytics formatting', () => {
    expect(formatMonthReportCard(CARD)).toBe(
      [
        'OpenJournal — 2026-10 report card',
        'Trades: 12 · Net: +$340.00 · Win-rate: 58.33% · PF: 1.80',
        'Best Setup: Breakout (+$500.00) · Worst Setup: Chop (-$210.00)',
        'Top Mistake: Moved-stop ×3 · Compliance: 75.00% (8/12 scored)',
      ].join('\n'),
    );
  });

  it('writes em-dashes for an empty month with working copy', () => {
    expect(
      formatMonthReportCard({
        monthKey: '2026-10',
        totalTrades: 0,
        netTotal: 0,
        winRate: 0,
        profitFactor: 0,
        bestSetup: null,
        worstSetup: null,
        topMistake: null,
        avgCompliance: null,
        scored: 0,
        unscored: 0,
      }),
    ).toBe(
      [
        'OpenJournal — 2026-10 report card',
        'Trades: 0 · Net: $0.00 · Win-rate: 0.00% · PF: 0.00',
        'Best Setup: — · Worst Setup: —',
        'Top Mistake: — · Compliance: — (0/0 scored)',
      ].join('\n'),
    );
  });

  it('renders infinite Profit Factor and unscored Compliance', () => {
    expect(
      formatMonthReportCard({
        ...CARD,
        totalTrades: 2,
        profitFactor: Infinity,
        avgCompliance: null,
        scored: 0,
      }),
    ).toContain('PF: ∞');
    expect(
      formatMonthReportCard({
        ...CARD,
        totalTrades: 2,
        avgCompliance: null,
        scored: 0,
      }),
    ).toContain('Compliance: — (0/2 scored)');
  });

  it('round-trips a derived card through the formatter', () => {
    const win = tradeFixture({ asset: 'W', exitPrice: 110, fees: 1 });
    const text = formatMonthReportCard(
      computeMonthReportCard([win], 2026, 9),
    );
    expect(text).toBe(
      [
        'OpenJournal — 2026-10 report card',
        'Trades: 1 · Net: +$99.00 · Win-rate: 100.00% · PF: ∞',
        'Best Setup: Breakout (+$99.00) · Worst Setup: —',
        'Top Mistake: None-followed-plan ×1 · Compliance: — (0/1 scored)',
      ].join('\n'),
    );
  });
});
