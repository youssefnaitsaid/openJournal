import { describe, expect, it } from 'vitest';
import type { Grade } from './trade';
import { tradeFixture } from './trade-fixtures';
import {
  EMPTY_FILTER,
  applyGlobalFilter,
  countActiveFilterAxes,
  isFilterActive,
} from './trades-filter';

const WIN_FOMC = () =>
  tradeFixture({
    asset: 'MES',
    side: 'Long',
    quantity: 2,
    entryPrice: 5000,
    exitPrice: 5010,
    closedAt: '2026-10-02T14:30:00.000Z',
    setup: 'Breakout',
    tags: ['FOMC'],
  });

const LOSS_EARNINGS = () =>
  tradeFixture({
    asset: 'AAPL',
    side: 'Short',
    quantity: 10,
    entryPrice: 200,
    exitPrice: 210,
    closedAt: '2026-10-05T14:30:00.000Z',
    setup: 'Pullback',
    tags: ['earnings'],
  });

const FLAT_UNTAGGED = () =>
  tradeFixture({
    asset: 'mes',
    closedAt: '2026-10-03T14:30:00.000Z',
  });

const graded = (grade: Grade | '') => tradeFixture({ asset: `G-${grade || 'NONE'}`, grade });

describe('applyGlobalFilter', () => {
  it('returns every Trade when the filter is empty', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS(), FLAT_UNTAGGED()];
    expect(applyGlobalFilter(trades, EMPTY_FILTER)).toEqual(trades);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it('matches Asset as a case-insensitive substring', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS(), FLAT_UNTAGGED()];
    const assets = applyGlobalFilter(
      trades,
      { ...EMPTY_FILTER, asset: 'es' },
    ).map((t) => t.asset);
    expect(assets).toEqual(['MES', 'mes']);
  });

  it('matches Setup, Side, and Tag exactly and case-sensitively', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS()];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, setup: 'Breakout' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, setup: 'breakout' }),
    ).toEqual([]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, side: 'Short' }),
    ).toEqual([trades[1]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, tag: 'FOMC' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, tag: 'fomc' }),
    ).toEqual([]);
  });

  it('excludes untagged Trades when a Tag is set', () => {
    const trades = [WIN_FOMC(), FLAT_UNTAGGED()];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, tag: 'FOMC' }),
    ).toEqual([trades[0]]);
  });

  it('splits Win, Loss, and Breakeven with Breakevens outside Win and Loss', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS(), FLAT_UNTAGGED()];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, outcome: 'Win' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, outcome: 'Loss' }),
    ).toEqual([trades[1]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, outcome: 'Breakeven' }),
    ).toEqual([trades[2]]);
  });

  it('bounds UTC close dates inclusively with open ends', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS(), FLAT_UNTAGGED()];
    expect(
      applyGlobalFilter(
        trades,
        { ...EMPTY_FILTER, dateFrom: '2026-10-03', dateTo: '2026-10-05' },
      ).map((t) => t.asset),
    ).toEqual(['AAPL', 'mes']);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, dateTo: '2026-10-02' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, dateFrom: '2026-10-06' }),
    ).toEqual([]);
  });

  it('ANDs axes together and flags activity', () => {
    const trades = [WIN_FOMC(), LOSS_EARNINGS()];
    const filter = {
      ...EMPTY_FILTER,
      asset: 'mes',
      setup: 'Breakout',
      outcome: 'Win' as const,
    };
    expect(applyGlobalFilter(trades, filter)).toEqual([trades[0]]);
    expect(isFilterActive(filter)).toBe(true);
  });

  it('treats pre-tag Trades as untagged instead of throwing', () => {
    const legacy = WIN_FOMC();
    delete (legacy as Partial<typeof legacy>).tags;
    expect(
      applyGlobalFilter([legacy], { ...EMPTY_FILTER, tag: 'FOMC' }),
    ).toEqual([]);
    expect(applyGlobalFilter([legacy], EMPTY_FILTER)).toEqual([legacy]);
  });

  it('keeps the Grade axis empty by default and inactive', () => {
    expect(EMPTY_FILTER.grade).toBe('');
    expect(EMPTY_FILTER.needsReview).toBe(false);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it('counts active axes with the close-date range as one axis', () => {
    expect(countActiveFilterAxes(EMPTY_FILTER)).toBe(0);
    expect(
      countActiveFilterAxes({ ...EMPTY_FILTER, dateFrom: '2026-10-01' }),
    ).toBe(1);
    expect(
      countActiveFilterAxes({
        ...EMPTY_FILTER,
        dateFrom: '2026-10-01',
        dateTo: '2026-10-03',
      }),
    ).toBe(1);
    expect(
      countActiveFilterAxes({
        ...EMPTY_FILTER,
        asset: 'mes',
        needsReview: true,
      }),
    ).toBe(2);
    expect(
      countActiveFilterAxes({
        dateFrom: '2026-10-01',
        dateTo: '2026-10-03',
        asset: 'mes',
        setup: 'Breakout',
        side: 'Long',
        tag: 'FOMC',
        outcome: 'Win',
        grade: 'A',
        needsReview: true,
      }),
    ).toBe(8);
    expect(
      countActiveFilterAxes({ ...EMPTY_FILTER, outcome: 'All' }),
    ).toBe(0);
  });

  it('matches Grade exactly and excludes ungraded Trades', () => {
    const trades = [graded('A'), graded('C'), graded('D'), graded('')];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, grade: 'C' }),
    ).toEqual([trades[1]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, grade: 'A' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, grade: 'B' }),
    ).toEqual([]);
    expect(isFilterActive({ ...EMPTY_FILTER, grade: 'D' })).toBe(true);
  });

  it('keeps Trades flagged for review (Grade C or D) when Needs review is on', () => {
    const trades = [graded('A'), graded('B'), graded('C'), graded('D'), graded('')];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, needsReview: true }),
    ).toEqual([trades[2], trades[3]]);
    expect(isFilterActive({ ...EMPTY_FILTER, needsReview: true })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, needsReview: false })).toBe(false);
  });

  it('ANDs Needs review with Grade: only the flagged half survives', () => {
    const trades = [graded('C'), graded('D')];
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, needsReview: true, grade: 'C' }),
    ).toEqual([trades[0]]);
    expect(
      applyGlobalFilter(trades, { ...EMPTY_FILTER, needsReview: true, grade: 'A' }),
    ).toEqual([]);
  });

  it('ANDs Grade with the existing axes', () => {
    const fomcWinA = tradeFixture({
      asset: 'MES',
      grade: 'A',
      quantity: 2,
      entryPrice: 5000,
      exitPrice: 5010,
      closedAt: '2026-10-02T14:30:00.000Z',
      setup: 'Breakout',
      tags: ['FOMC'],
    });
    const fomcWinB = tradeFixture({
      asset: 'MES',
      grade: 'B',
      quantity: 2,
      entryPrice: 5000,
      exitPrice: 5010,
      closedAt: '2026-10-02T14:30:00.000Z',
      setup: 'Breakout',
      tags: ['FOMC'],
    });
    const plainLossC = tradeFixture({
      asset: 'AAPL',
      grade: 'C',
      quantity: 10,
      entryPrice: 200,
      exitPrice: 210,
      side: 'Short',
      closedAt: '2026-10-05T14:30:00.000Z',
      setup: 'Pullback',
    });
    const trades = [fomcWinA, fomcWinB, plainLossC];
    expect(
      applyGlobalFilter(trades, {
        ...EMPTY_FILTER,
        grade: 'A',
        tag: 'FOMC',
        outcome: 'Win',
        setup: 'Breakout',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-03',
      }),
    ).toEqual([fomcWinA]);
    expect(
      applyGlobalFilter(trades, {
        ...EMPTY_FILTER,
        needsReview: true,
        side: 'Short',
      }),
    ).toEqual([plainLossC]);
  });
});
