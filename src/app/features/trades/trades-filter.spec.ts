import { describe, expect, it } from 'vitest';
import { tradeFixture } from './trade-fixtures';
import {
  EMPTY_FILTER,
  applyGlobalFilter,
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
});
