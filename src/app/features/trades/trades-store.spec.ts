import { TestBed } from '@angular/core/testing';
import { Collection } from '@signaldb/core';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { beforeEach, describe, expect, it } from 'vitest';
import { TradesStore } from './trades-store';
import type { Trade, TradeInput } from './trade';

const INPUT: TradeInput = {
  asset: 'AAPL',
  market: 'Stocks',
  side: 'Long',
  quantity: 10,
  multiplier: 1,
  entryPrice: 100,
  exitPrice: 110,
  stopPrice: 98,
  takePrice: 115,
  fees: 1,
  openedAt: '2026-10-01T13:30:00.000Z',
  closedAt: '2026-10-01T14:30:00.000Z',
  setup: 'Breakout',
  emotionBefore: 'Calm',
  emotionAfter: 'Disciplined',
  mistake: 'None-followed-plan',
  chartUrl: '',
  notes: '',
};

describe('TradesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('derives Net P&L when a Trade is logged', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const trade = store.addTrade(INPUT);
    expect(trade.net).toBe(99);
    expect(trade.rMultiple).toBeCloseTo(4.95, 10);
    expect(store.trades().length).toBe(1);
  });

  it('persists logged Trades across reloads', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(INPUT);
    const raw = new Collection<Trade, string>({
      persistence: createLocalStorageAdapter<Trade, string>(
        'openjournal-trades',
      ),
    });
    await raw.isReady();
    const loaded = raw.find().fetch();
    expect(loaded.length).toBe(1);
    expect(loaded[0]?.asset).toBe('AAPL');
    expect(loaded[0]?.net).toBe(99);
  });

  it('lists Trades newest close first', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'OLD', closedAt: '2026-10-01T14:30:00.000Z' });
    store.addTrade({ ...INPUT, asset: 'NEW', closedAt: '2026-10-02T14:30:00.000Z' });
    expect(store.byCloseDesc().map((t) => t.asset)).toEqual(['NEW', 'OLD']);
  });
});
