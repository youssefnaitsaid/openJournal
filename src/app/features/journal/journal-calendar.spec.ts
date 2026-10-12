import { describe, expect, it } from 'vitest';
import { tradeFixture } from '../trades/trade-fixtures';
import { buildMonth, monthSummary } from './journal-calendar';

describe('buildMonth', () => {
  it('starts October 2026 on Thursday with leading blanks (UTC)', () => {
    const weeks = buildMonth([], 2026, 9);
    expect(weeks[0]?.slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0]?.[4]).toMatchObject({ date: '2026-10-01' });
    expect(weeks[0]?.[6]).toMatchObject({ date: '2026-10-03' });
  });

  it('buckets Trades by close day with day Net', () => {
    const win = tradeFixture({ asset: 'WIN', exitPrice: 110, fees: 1 });
    const loss = tradeFixture({
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
    const win = tradeFixture({ asset: 'WIN', exitPrice: 110 });
    const weeks = buildMonth([win], 2026, 10);
    expect(
      weeks.flat().every((c) => c === null || c.trades.length === 0),
    ).toBe(true);
  });
});

describe('monthSummary', () => {
  it('sums month Net and ends balance from the shared derivation', () => {
    const oct = [
      tradeFixture({ asset: 'A', exitPrice: 110, fees: 1 }),
      tradeFixture({
        asset: 'B',
        exitPrice: 90,
        fees: 5,
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    ];
    const nov = [
      tradeFixture({
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
