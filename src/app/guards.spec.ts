import { beforeEach, describe, expect, it } from 'vitest';
import { tradeFixture } from './features/trades/trade-fixtures';
import {
  GUARDS_STORAGE_KEY,
  UNSET_GUARDS,
  guardsFor,
  hasAnyGuard,
  evaluateDayGuards,
  evaluateGuards,
  evaluateWeekGuards,
  loadGuardMap,
  loadGuards,
  saveGuardMap,
  saveGuards,
  setGuardSettings,
  validateGuardInput,
  weekKeyOfDay,
} from './guards';

function localCloseAt(hour: number, minute: number): string {
  return new Date(2026, 9, 1, hour, minute).toISOString();
}

describe('daily loss Guard', () => {
  it('breaches when the day Net reaches the negated limit', () => {
    const loss = tradeFixture({ asset: 'LOSS', exitPrice: 90, fees: 5 });
    expect(loss.net).toBe(-105);
    const status = evaluateDayGuards([loss], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxLoss: 105 },
    });
    expect(status.breached).toContain('daily-loss');
  });

  it('stays inside when the day Net is a cent above the limit', () => {
    const loss = tradeFixture({ asset: 'LOSS', exitPrice: 90, fees: 5 });
    const status = evaluateDayGuards([loss], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxLoss: 106 },
    });
    expect(status.breached).not.toContain('daily-loss');
    expect(status.inside).toBe(true);
  });

  it('never breaches on an empty day or when unset', () => {
    expect(evaluateDayGuards([], UNSET_GUARDS).breached).toEqual([]);
    const loss = tradeFixture({ asset: 'LOSS', exitPrice: 90, fees: 5 });
    expect(evaluateDayGuards([loss], UNSET_GUARDS).breached).toEqual([]);
  });
});

describe('daily stop time Guard', () => {
  const withStop = { ...UNSET_GUARDS, daily: { ...UNSET_GUARDS.daily, stopTime: '15:30' } };

  it('breaches when a close lands strictly after the cutoff', () => {
    const late = tradeFixture({ asset: 'LATE', closedAt: localCloseAt(15, 31) });
    expect(evaluateDayGuards([late], withStop).breached).toContain('daily-stop');
  });

  it('stays safe when the close lands exactly at the cutoff', () => {
    const edge = tradeFixture({ asset: 'EDGE', closedAt: localCloseAt(15, 30) });
    const status = evaluateDayGuards([edge], withStop);
    expect(status.breached).not.toContain('daily-stop');
    expect(status.inside).toBe(true);
  });

  it('ignores malformed cutoffs as unset', () => {
    const late = tradeFixture({ asset: 'LATE', closedAt: localCloseAt(15, 31) });
    const bad = {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, stopTime: 'after lunch' },
    };
    expect(evaluateDayGuards([late], bad).breached).toEqual([]);
  });
});

describe('weekly Guards', () => {
  it('keys the full ISO week by its Monday even across months', () => {
    expect(weekKeyOfDay('2026-10-01')).toBe('2026-09-28');
    expect(weekKeyOfDay('2026-09-30')).toBe(weekKeyOfDay('2026-10-02'));
    expect(weekKeyOfDay('2026-10-05')).not.toBe(weekKeyOfDay('2026-10-02'));
  });

  it('breaches weekly count across a month edge in one week', () => {
    const sep = tradeFixture({ asset: 'SEP', closedAt: '2026-09-30T14:30:00.000Z' });
    const oct = tradeFixture({ asset: 'OCT', closedAt: '2026-10-02T14:30:00.000Z' });
    const limited = { ...UNSET_GUARDS, weekly: { maxLoss: null, maxTrades: 1 } };
    expect(evaluateWeekGuards([sep, oct], limited).breached).toContain('weekly-count');
    expect(evaluateWeekGuards([sep], limited).breached).toEqual([]);
  });

  it('breaches weekly loss on the summed week Net', () => {
    const a = tradeFixture({ asset: 'A', exitPrice: 90, fees: 5, closedAt: '2026-09-30T14:30:00.000Z' });
    const b = tradeFixture({ asset: 'B', exitPrice: 95, fees: 0, closedAt: '2026-10-02T14:30:00.000Z' });
    expect(a.net + b.net).toBe(-155);
    const limited = { ...UNSET_GUARDS, weekly: { maxLoss: 150, maxTrades: null } };
    expect(evaluateWeekGuards([a, b], limited).breached).toContain('weekly-loss');
  });

  it('evaluates the full journal into day and week maps', () => {
    const sep = tradeFixture({ asset: 'SEP', exitPrice: 90, fees: 5, closedAt: '2026-09-30T14:30:00.000Z' });
    const oct = tradeFixture({ asset: 'OCT', closedAt: '2026-10-02T14:30:00.000Z' });
    const settings = {
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: 1 },
    };
    const result = evaluateGuards([sep, oct], settings);
    expect(result.days.get('2026-09-30')?.breached).toContain('daily-loss');
    expect(result.days.get('2026-10-02')?.breached).toEqual([]);
    expect(result.weeks.get('2026-09-28')?.breached).toContain('weekly-count');
  });
});

describe('hasAnyGuard', () => {
  it('reads all-unset as no Guards and any set value as guarded', () => {
    expect(hasAnyGuard(UNSET_GUARDS)).toBe(false);
    expect(
      hasAnyGuard({ ...UNSET_GUARDS, daily: { maxLoss: null, maxTrades: null, stopTime: '15:30' } }),
    ).toBe(true);
    expect(
      hasAnyGuard({ ...UNSET_GUARDS, weekly: { maxLoss: 500, maxTrades: null } }),
    ).toBe(true);
  });
});

describe('Guard persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to unset with nothing stored', () => {
    expect(loadGuards()).toEqual(UNSET_GUARDS);
  });

  it('round-trips saved Guards', () => {
    saveGuards({
      daily: { maxLoss: 200, maxTrades: 3, stopTime: '15:30' },
      weekly: { maxLoss: 500, maxTrades: 10 },
    });
    expect(loadGuards()).toEqual({
      daily: { maxLoss: 200, maxTrades: 3, stopTime: '15:30' },
      weekly: { maxLoss: 500, maxTrades: 10 },
    });
    expect(localStorage.getItem(GUARDS_STORAGE_KEY)).not.toBeNull();
  });

  it('falls back to unset on corrupt input', () => {
    localStorage.setItem(GUARDS_STORAGE_KEY, 'junk');
    expect(loadGuards()).toEqual(UNSET_GUARDS);
    localStorage.setItem(GUARDS_STORAGE_KEY, JSON.stringify({ daily: { maxLoss: -50 } }));
    expect(loadGuards()).toEqual(UNSET_GUARDS);
  });

  it('keeps Guard settings isolated per portfolio', () => {
    setGuardSettings(loadGuardMap(), 'es', {
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    const map = loadGuardMap();
    expect(guardsFor(map, 'es').daily.maxLoss).toBe(200);
    expect(guardsFor(map, 'swing')).toEqual(UNSET_GUARDS);
    expect(hasAnyGuard(guardsFor(map, 'swing'))).toBe(false);
  });

  it('migrates a legacy single-portfolio Guard file into the default book', () => {
    localStorage.setItem(
      GUARDS_STORAGE_KEY,
      JSON.stringify({
        daily: { maxLoss: 200, maxTrades: null, stopTime: null },
        weekly: { maxLoss: null, maxTrades: null },
      }),
    );
    expect(guardsFor(loadGuardMap(), 'default').daily.maxLoss).toBe(200);
    expect(loadGuards()).toEqual({
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
  });

  it('reads blank and zero as unset', () => {
    const { settings, errors } = validateGuardInput({
      dailyMaxLoss: '',
      dailyMaxTrades: '0',
      stopTime: '',
      weeklyMaxLoss: '0',
      weeklyMaxTrades: '',
    });
    expect(errors).toEqual([]);
    expect(settings).toEqual(UNSET_GUARDS);
  });

  it('rejects invalid values naming the Guard', () => {
    const { settings, errors } = validateGuardInput({
      dailyMaxLoss: '-50',
      dailyMaxTrades: '3',
      stopTime: '25:00',
      weeklyMaxLoss: '500',
      weeklyMaxTrades: 'ten',
    });
    expect(settings.daily.maxLoss).toBeNull();
    expect(settings.daily.stopTime).toBeNull();
    expect(settings.weekly.maxTrades).toBeNull();
    expect(errors.join(' ')).toContain('Daily loss Guard');
    expect(errors.join(' ')).toContain('Daily stop time Guard');
    expect(errors.join(' ')).toContain('Weekly trade count Guard');
    expect(settings.daily.maxTrades).toBe(3);
    expect(settings.weekly.maxLoss).toBe(500);
  });
});

describe('daily count Guard', () => {
  it('allows exactly max and breaches on the over-max Trade', () => {
    const a = tradeFixture({ asset: 'A' });
    const b = tradeFixture({ asset: 'B' });
    const c = tradeFixture({ asset: 'C' });
    const atMax = evaluateDayGuards([a, b, c], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxTrades: 3 },
    });
    expect(atMax.breached).not.toContain('daily-count');
    const over = evaluateDayGuards([a, b, c, tradeFixture({ asset: 'D' })], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxTrades: 3 },
    });
    expect(over.breached).toContain('daily-count');
  });

  it('counts Breakevens as Trades', () => {
    const flat = tradeFixture({ asset: 'FLAT' });
    expect(flat.net).toBe(0);
    const single = evaluateDayGuards([flat], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxTrades: 1 },
    });
    expect(single.breached).not.toContain('daily-count');
    const over = evaluateDayGuards([flat, tradeFixture({ asset: 'G' })], {
      ...UNSET_GUARDS,
      daily: { ...UNSET_GUARDS.daily, maxTrades: 1 },
    });
    expect(over.breached).toContain('daily-count');
  });
});
