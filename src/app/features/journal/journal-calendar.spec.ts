import { describe, expect, it } from 'vitest';
import { deriveTrade } from '../trades/trade-math';
import type { TradeInput } from '../trades/trade';
import { buildMonth, monthSummary } from './journal-calendar';

let n = 0;

function input(overrides: Partial<TradeInput>): TradeInput {
  return {
    asset: 'A',
    market: 'Stocks',
    side: 'Long',
    quantity: 10,
    multiplier: 1,
    entryPrice: 100,
    exitPrice: 100,
    stopPrice: null,
    takePrice: null,
    fees: 0,
    openedAt: '2026-10-01T13:30:00.000Z',
    closedAt: '2026-10-01T14:30:00.000Z',
    setup: 'Breakout',
    emotionBefore: 'Calm',
    emotionAfter: 'Calm',
    mistake: 'None-followed-plan',
    chartUrl: '',
    notes: '',
    ...overrides,
  };
}

function trade(overrides: Partial<TradeInput>) {
  return deriveTrade(input(overrides), `j${++n}`);
}

describe('buildMonth', () => {
  it('starts October 2026 on Thursday with leading blanks (UTC)', () => {
    const weeks = buildMonth([], 2026, 9);
    expect(weeks[0]?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0]?.[4]).toMatchObject({ date: '2026-10-01' });
    expect(weeks[0]?.[6]).toMatchObject({ date: '2026-10-03' });
  });

  it('buckets Trades by close day with day Net', () => {
    const win = trade({ asset: 'WIN', exitPrice: 110, fees: 1 });
    const loss = trade({
      asset: 'LOSS',
      exitPrice: 90,
      fees: 5,
      closedAt: '2026-10-03T14:30:00.000Z',
    });
    const weeks = buildMonth([win, loss], 2026, 9);
    const cells = weeks.flat().filter((c) => c !== null);
    const oct1 = cells.find((c) => c.date === '2026-10-01');
    const oct3 = cells.find((c) => c.date === '2026-10-03');
    expect(oct1?.dayNet).toBe(99);
    expect(oct1?.trades.map((t) => t.asset)).toEqual(['WIN']);
    expect(oct3?.dayNet).toBe(-105);
    expect(cells.find((c) => c.date === '2026-10-02')?.dayNet).toBe(0);
  });

  it('keeps months without Trades empty', () => {
    const win = trade({ asset: 'WIN', exitPrice: 110 });
    const weeks = buildMonth([win], 2026, 10);
    expect(
      weeks.flat().every((c) => c === null || c.trades.length === 0),
    ).toBe(true);
  });
});

describe('monthSummary', () => {
  it('sums month Net and ends balance from the shared derivation', () => {
    const oct = [
      trade({ asset: 'A', exitPrice: 110, fees: 1 }),
      trade({
        asset: 'B',
        exitPrice: 90,
        fees: 5,
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    ];
    const nov = [
      trade({
        asset: 'C',
        side: 'Short',
        entryPrice: 50,
        exitPrice: 45,
        closedAt: '2026-11-01T14:30:00.000Z',
      }),
    ];
    expect(monthSummary([...oct, ...nov], 2026, 9, 10000)).toEqual({
      monthNet: -6,
      balanceEnd: 9994,
    });
    expect(monthSummary([...oct, ...nov], 2026, 10, 10000)).toEqual({
      monthNet: 50,
      balanceEnd: 10044,
    });
  });
});
